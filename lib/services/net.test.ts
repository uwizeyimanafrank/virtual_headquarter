// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const hits: { path: string; auth?: string }[] = [];
let server: http.Server;
let port = 0;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    hits.push({ path: req.url ?? "", auth: req.headers.authorization });
    if (req.url === "/redirect") { res.writeHead(302, { location: "/secret" }); return res.end(); }
    if (req.url === "/slow") return; // never answers
    res.writeHead(200); res.end("hello");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => { server.closeAllConnections(); server.close(); });
beforeEach(() => { hits.length = 0; vi.resetModules(); });
afterEach(() => vi.unstubAllEnvs());

const load = async () => import("@/lib/services/net");

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "127.1.2.3", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "224.0.0.1", "255.255.255.255", "192.0.2.10", "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.1.2.3", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1", "not-an-ip", "",
  ])("blocks %s", async (ip) => { expect((await load()).isPrivateAddress(ip)).toBe(true); });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "172.15.255.255", "2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"])("allows %s", async (ip) => {
    expect((await load()).isPrivateAddress(ip)).toBe(false);
  });
});

describe("probe (the safe health check)", () => {
  it("refuses addresses on this machine by default, and never sends a request", async () => {
    const { probe } = await load();
    for (const url of [`http://127.0.0.1:${port}/x`, `http://localhost:${port}/x`, `http://[::1]:${port}/x`, `http://2130706433:${port}/x`, `http://127.1:${port}/x`, `http://0x7f.0.0.1:${port}/x`, "http://169.254.169.254/latest/meta-data/", "http://0.0.0.0:80/"]) {
      await expect(probe(url)).rejects.toMatchObject({ code: "PRIVATE_ADDRESS" });
    }
    expect(hits).toHaveLength(0);
  });

  it("works against a private address only when the owner explicitly allowed it", async () => {
    vi.stubEnv("ALLOW_PRIVATE_SERVICE_TARGETS", "true");
    const { probe } = await load();
    const r = await probe(`http://127.0.0.1:${port}/health`);
    expect(r.status).toBe(200);
    expect(r.ms).toBeGreaterThanOrEqual(0);
    expect(hits).toEqual([{ path: "/health", auth: undefined }]);
    expect((await probe(`http://localhost:${port}/health`)).status).toBe(200); // names work too when allowed
  });

  it("only accepts web addresses without login details", async () => {
    vi.stubEnv("ALLOW_PRIVATE_SERVICE_TARGETS", "true");
    const { probe } = await load();
    for (const url of ["file:///etc/passwd", "ftp://example.com/x", "javascript:alert(1)", `http://user:pass@127.0.0.1:${port}/`, "not a url", ""]) {
      await expect(probe(url)).rejects.toMatchObject({ message: "BAD_URL" });
    }
    expect(hits).toHaveLength(0);
  });

  it("does not follow redirects", async () => {
    vi.stubEnv("ALLOW_PRIVATE_SERVICE_TARGETS", "true");
    const { probe } = await load();
    expect((await probe(`http://127.0.0.1:${port}/redirect`)).status).toBe(302);
    expect(hits.map((h) => h.path)).toEqual(["/redirect"]); // /secret was never requested
  });

  it("sends the access token as a Bearer header", async () => {
    vi.stubEnv("ALLOW_PRIVATE_SERVICE_TARGETS", "true");
    const { probe } = await load();
    await probe(`http://127.0.0.1:${port}/x`, { token: "tok-123" });
    expect(hits[0].auth).toBe("Bearer tok-123");
  });

  it("gives up after the time limit", async () => {
    vi.stubEnv("ALLOW_PRIVATE_SERVICE_TARGETS", "true");
    const { probe } = await load();
    await expect(probe(`http://127.0.0.1:${port}/slow`, { timeoutMs: 300 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("any value other than exactly 'true' keeps private addresses blocked", async () => {
    for (const v of ["1", "yes", "TRUE", "false", ""]) {
      vi.resetModules();
      vi.stubEnv("ALLOW_PRIVATE_SERVICE_TARGETS", v);
      await expect((await load()).probe(`http://127.0.0.1:${port}/x`)).rejects.toMatchObject({ code: "PRIVATE_ADDRESS" });
    }
    expect(hits).toHaveLength(0);
  });
});
