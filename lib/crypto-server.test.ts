// @vitest-environment node
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); vi.stubEnv("SERVICE_CRED_KEY", randomBytes(32).toString("base64")); });
afterEach(() => vi.unstubAllEnvs());
const load = () => import("@/lib/crypto-server");

describe("crypto-server (encrypts secrets the server must read again)", () => {
  it("round trip works and the stored text hides the secret", async () => {
    const { encryptSecret, decryptSecret } = await load();
    const enc = encryptSecret("my-secret-api-key", "service:abc");
    expect(enc.startsWith("v1.")).toBe(true);
    expect(enc).not.toContain("my-secret-api-key");
    expect(decryptSecret(enc, "service:abc")).toBe("my-secret-api-key");
  });
  it("two encryptions of the same text differ (random IV)", async () => {
    const { encryptSecret } = await load();
    expect(encryptSecret("same", "x")).not.toBe(encryptSecret("same", "x"));
  });
  it("a value cannot be moved to another service or another use (the label is bound in)", async () => {
    const { encryptSecret, decryptSecret } = await load();
    const enc = encryptSecret("secret", "service:aaa");
    expect(() => decryptSecret(enc, "service:bbb")).toThrow();
    expect(() => decryptSecret(enc, "totp")).toThrow();
  });
  it("tampering is detected", async () => {
    const { encryptSecret, decryptSecret } = await load();
    const [v, iv, tag, ct] = encryptSecret("secret", "x").split(".");
    const flipped = ct.slice(0, -2) + (ct.endsWith("AA") ? "BB" : "AA");
    expect(() => decryptSecret([v, iv, tag, flipped].join("."), "x")).toThrow();
    expect(() => decryptSecret("garbage", "x")).toThrow();
  });
  it("a wrong key cannot read it", async () => {
    const a = await load();
    const enc = a.encryptSecret("secret", "x");
    vi.resetModules();
    vi.stubEnv("SERVICE_CRED_KEY", randomBytes(32).toString("base64"));
    const b = await load();
    expect(() => b.decryptSecret(enc, "x")).toThrow();
  });
  it("refuses a key of the wrong size with a readable message", async () => {
    vi.stubEnv("SERVICE_CRED_KEY", Buffer.from("short").toString("base64"));
    vi.resetModules();
    const { encryptSecret } = await load();
    expect(() => encryptSecret("x", "y")).toThrow(/32 random bytes/);
  });
});
