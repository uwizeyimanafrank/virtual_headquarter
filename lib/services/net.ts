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
function guardedLookup(hostname: string, options: dns.LookupOptions | number | LookupCb, cb?: LookupCb) {
  const done = typeof options === "function" ? options : cb!;
  const opts: dns.LookupOptions = typeof options === "function" || typeof options === "number" ? {} : options;
  dns.lookup(hostname, { ...opts, all: true }, (err, addrs) => {
    if (err) return done(err);
    const list = addrs as dns.LookupAddress[];
    if (!allowPrivateTargets() && list.some((a) => isPrivateAddress(a.address))) {
      const e: NodeJS.ErrnoException = new Error("PRIVATE_ADDRESS");
      e.code = "PRIVATE_ADDRESS";
      return done(e);
    }
    if (opts.all) return done(null, list);
    done(null, list[0].address, list[0].family);
  });
}

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
