// @vitest-environment node
import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getEnv: () => ({ ALLOW_PRIVATE_SERVICE_TARGETS: "true" }) })); // even with private targets allowed for monitoring, downloads still refuse them

import { DownloadError, collectBody, redirectTarget, safeDownload } from "@/lib/services/net";

const stream = (headers: Record<string, string> = {}) => Object.assign(new PassThrough(), { headers });
const code = async (p: Promise<unknown>) => (await p.then(() => "ok", (e) => (e instanceof DownloadError ? e.code : `other:${e}`)));

describe("redirectTarget", () => {
  it("follows real redirects, resolves relative addresses, ignores everything else", () => {
    expect(redirectTarget("https://a.example/x", 302, "https://b.example/y")).toBe("https://b.example/y");
    expect(redirectTarget("https://a.example/x/z", 301, "/p/q.jpg")).toBe("https://a.example/p/q.jpg");
    expect(redirectTarget("https://a.example/x", 200, "https://b.example/")).toBeNull();
    expect(redirectTarget("https://a.example/x", 302, undefined)).toBeNull();
  });
});

describe("collectBody", () => {
  it("returns the bytes when they fit", async () => {
    const s = stream();
    const p = collectBody(s, 10);
    s.write(Buffer.from("abc")); s.end(Buffer.from("def"));
    expect((await p).toString()).toBe("abcdef");
  });
  it("refuses at once when the server announces a file that is too big", async () => {
    expect(await code(collectBody(stream({ "content-length": "999" }), 100))).toBe("TOO_BIG");
  });
  it("stops reading when the file turns out to be too big (even if it lied about the size)", async () => {
    const s = stream({ "content-length": "5" });
    const p = collectBody(s, 8);
    s.write(Buffer.alloc(5)); s.write(Buffer.alloc(5));
    expect(await code(p)).toBe("TOO_BIG");
  });
});

describe("safeDownload refuses unsafe addresses before connecting", () => {
  const opts = { maxBytes: 1000, timeoutMs: 1500 };
  it("only https, no login details, valid address", async () => {
    for (const u of ["http://images.example/a.jpg", "ftp://x.example/a.jpg", "file:///etc/passwd", "https://user:pw@images.example/a.jpg", "not a url", ""]) {
      expect(await code(safeDownload(u, opts)), u).toBe("BAD_URL");
    }
  });
  it("private, local and cloud-metadata addresses", async () => {
    for (const u of ["https://127.0.0.1/a.jpg", "https://10.0.0.5/a.jpg", "https://192.168.1.1/a.jpg", "https://169.254.169.254/latest/meta-data", "https://[::1]/a.jpg", "https://0.0.0.0/a.jpg"]) {
      expect(await code(safeDownload(u, opts)), u).toBe("PRIVATE_ADDRESS");
    }
  });
  it("a name that resolves to this machine", async () => {
    expect(await code(safeDownload("https://localhost/a.jpg", opts))).toBe("PRIVATE_ADDRESS");
  });
});
