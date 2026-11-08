import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { getEnv } from "@/lib/env";

// Addresses a monitored service must never point at: this machine, private networks, link-local
// (cloud metadata lives at 169.254.169.254), carrier-grade NAT, documentation and reserved ranges.
const blocked = new net.BlockList();
// check:urls-ignore (this list NAMES the private ranges we refuse; it is not an address we call)
for (const [net4, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]] as const) blocked.addSubnet(net4, bits, "ipv4"); // check:urls-ignore
for (const [net6, bits] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["2001:db8::", 32], ["64:ff9b::", 96]] as const) blocked.addSubnet(net6, bits, "ipv6");

/** True for any address that is not an ordinary public internet address. Also handles IPv4 written inside IPv6. */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 0) return true; // not an address at all: refuse
  if (kind === 4) return blocked.check(ip, "ipv4");
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip); // an IPv4 address written inside an IPv6 one is judged as the IPv4 address
  if (mapped) return blocked.check(mapped[1], "ipv4");
  const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip); // same thing written in hex
  if (hexMapped) {
    const hi = parseInt(hexMapped[1], 16), lo = parseInt(hexMapped[2], 16);
    return blocked.check(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`, "ipv4");
  }
  return blocked.check(ip, "ipv6");
}

export const allowPrivateTargets = () => getEnv().ALLOW_PRIVATE_SERVICE_TARGETS === "true";

type LookupCb = (err: NodeJS.ErrnoException | null, address?: string | dns.LookupAddress[], family?: number) => void;

/**
 * DNS lookup used for the real connection. The answer that is CHECKED is the answer that is USED, so a
 * name that first points somewhere public and then somewhere private (DNS rebinding) cannot get through.
 */
function makeLookup(privateAllowed: () => boolean) {
  return function lookup(hostname: string, options: dns.LookupOptions | number | LookupCb, cb?: LookupCb) {
  const done = typeof options === "function" ? options : cb!;
  const opts: dns.LookupOptions = typeof options === "function" || typeof options === "number" ? {} : options;
  dns.lookup(hostname, { ...opts, all: true }, (err, addrs) => {
    if (err) return done(err);
    const list = addrs as dns.LookupAddress[];
    if (!privateAllowed() && list.some((a) => isPrivateAddress(a.address))) {
      const e: NodeJS.ErrnoException = new Error("PRIVATE_ADDRESS");
      e.code = "PRIVATE_ADDRESS";
      return done(e);
    }
    if (opts.all) return done(null, list);
    done(null, list[0].address, list[0].family);
  });
  };
}
const guardedLookup = makeLookup(allowPrivateTargets);
/** Same check, but private destinations are refused even when the owner allowed them for monitoring. */
const strictLookup = makeLookup(() => false);

export type Probe = { status: number; ms: number };

/**
 * A careful health check of an address the owner typed in: http(s) only, no login details in the
 * address, no private destinations, no redirects followed, nothing of the answer kept except the
 * status code, and a hard time limit.
 */
export function probe(rawUrl: string, opts: { token?: string; timeoutMs?: number } = {}): Promise<Probe> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try { url = new URL(rawUrl); } catch { return reject(new Error("BAD_URL")); }
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return reject(new Error("BAD_URL"));
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && !allowPrivateTargets() && isPrivateAddress(host)) return reject(Object.assign(new Error("PRIVATE_ADDRESS"), { code: "PRIVATE_ADDRESS" }));

    const started = Date.now();
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      { method: "GET", lookup: guardedLookup as unknown as net.LookupFunction, headers: { "user-agent": "VHQ-monitor/1", accept: "*/*", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) } },
      (res) => { const status = res.statusCode ?? 0; res.destroy(); resolve({ status, ms: Date.now() - started }); },
    );
    req.setTimeout(opts.timeoutMs ?? 5000, () => req.destroy(Object.assign(new Error("TIMEOUT"), { code: "TIMEOUT" })));
    req.on("error", reject);
    req.end();
  });
}


// ---- Downloading a picture the owner pasted a link to (Office > Images, "paste an image link") ----

export class DownloadError extends Error {
  constructor(public code: "BAD_URL" | "PRIVATE_ADDRESS" | "TOO_BIG" | "TIMEOUT" | "TOO_MANY_REDIRECTS" | "NETWORK", message?: string) {
    super(message ?? code);
    this.name = "DownloadError";
  }
}

/** Where a redirect points, or null. Relative addresses are resolved against the current one. */
export function redirectTarget(current: string, status: number, location: string | undefined): string | null {
  if (![301, 302, 303, 307, 308].includes(status) || !location) return null;
  try { return new URL(location, current).toString(); } catch { return null; }
}

/** Reads a response body but stops (and refuses) as soon as it passes the limit. */
export function collectBody(res: NodeJS.ReadableStream & { destroy(err?: Error): unknown; headers?: Record<string, string | string[] | undefined> }, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(res.headers?.["content-length"]);
    if (Number.isFinite(declared) && declared > maxBytes) { res.destroy(); return reject(new DownloadError("TOO_BIG")); }
    const chunks: Buffer[] = [];
    let size = 0;
    res.on("data", (c: Buffer) => {
      size += c.length;
      if (size > maxBytes) { res.destroy(); return reject(new DownloadError("TOO_BIG")); }
      chunks.push(c);
    });
    res.on("end", () => resolve(Buffer.concat(chunks)));
    res.on("error", (e: Error) => reject(e instanceof DownloadError ? e : new DownloadError("NETWORK", e.message)));
  });
}

export type Downloaded = { status: number; contentType: string; body: Buffer; finalUrl: string };

/**
 * Downloads a file from an https address. https only, no login details in the address, private
 * destinations refused (also after every redirect, and when a name resolves to a private address),
 * at most 3 redirects, a size limit and a time limit.
 */
export async function safeDownload(rawUrl: string, opts: { maxBytes: number; timeoutMs?: number; maxRedirects?: number }): Promise<Downloaded> {
  const maxRedirects = opts.maxRedirects ?? 3;
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let url: URL;
    try { url = new URL(current); } catch { throw new DownloadError("BAD_URL"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new DownloadError("BAD_URL");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) && isPrivateAddress(host)) throw new DownloadError("PRIVATE_ADDRESS");

    const res = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
      const req = https.request(url, { method: "GET", lookup: strictLookup as unknown as net.LookupFunction, headers: { "user-agent": "VHQ-image-import/1", accept: "image/*" } }, resolve);
      const timer = setTimeout(() => req.destroy(new DownloadError("TIMEOUT")), opts.timeoutMs ?? 10_000);
      req.on("close", () => clearTimeout(timer));
      req.on("error", (e: NodeJS.ErrnoException) => reject(e instanceof DownloadError ? e : e.code === "PRIVATE_ADDRESS" ? new DownloadError("PRIVATE_ADDRESS") : new DownloadError("NETWORK", e.message)));
      req.end();
    });

    const next = redirectTarget(current, res.statusCode ?? 0, res.headers.location);
    if (next) { res.destroy(); current = next; continue; }
    const body = await collectBody(res, opts.maxBytes);
    return { status: res.statusCode ?? 0, contentType: String(res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase(), body, finalUrl: current };
  }
  throw new DownloadError("TOO_MANY_REDIRECTS");
}
