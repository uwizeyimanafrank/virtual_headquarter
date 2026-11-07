// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { buildUpdates, formatValue, mergeEnv, presentKeys, validateSetup } from "@/lib/setup-env";
import { codeMatches, isLoopbackHost, setupAllowedFor, setupCode, setupEnabled } from "@/lib/setup-guard";

describe("validateSetup", () => {
  it("accepts an empty form (everything is optional) and a good one", () => {
    expect(validateSetup({})).toEqual([]);
    expect(validateSetup({ mongoUri: "mongodb+srv://u:p@c.mongodb.net/vhq", officeSlug: "my-office-door", officePassword: "a-long-password-1", cloudName: "a", cloudApiKey: "b", cloudApiSecret: "c" })).toEqual([]);
  });
  it("catches the usual mistakes", () => {
    expect(validateSetup({ mongoUri: "http://nope" })).toHaveLength(1);
    expect(validateSetup({ mongoUri: "mongodb://has space" }).length).toBeGreaterThan(0);
    expect(validateSetup({ cloudName: "a" })).toHaveLength(1); // all three or none
    expect(validateSetup({ officeSlug: "short" })).toHaveLength(1);
    expect(validateSetup({ officeSlug: "Has-Capitals-Here" })).toHaveLength(1);
    expect(validateSetup({ officePassword: "too short" })).toHaveLength(1);
    expect(validateSetup({ appUrl: "localhost:3000" })).toHaveLength(1);
    expect(validateSetup({ geminiKey: "line1\nline2" })).toHaveLength(1); // one line only: no sneaking in extra variables
    expect(validateSetup({ geminiKey: 'has "quote"' })).toHaveLength(1);
    expect(validateSetup({ officePassword: "a password with spaces 'and quotes'" })).toEqual([]); // the password is never written to the file, only its hash
  });
});

describe("mergeEnv", () => {
  it("replaces known keys, keeps everything else, and adds new keys at the end", () => {
    const before = "# my notes\nMONGODB_URI=old\nOTHER=keep me\n\nGEMINI_API_KEY=\n";
    const after = mergeEnv(before, { MONGODB_URI: "mongodb://new", GEMINI_API_KEY: "k", SESSION_SECRET: "s" });
    expect(after).toContain("# my notes");
    expect(after).toContain("MONGODB_URI=mongodb://new");
    expect(after).not.toContain("MONGODB_URI=old");
    expect(after).toContain("OTHER=keep me");
    expect(after).toContain("GEMINI_API_KEY=k");
    expect(after.match(/GEMINI_API_KEY/g)).toHaveLength(1);
    expect(after).toContain("SESSION_SECRET=s");
    expect(after.endsWith("\n")).toBe(true);
  });
  it("starts a file from nothing", () => {
    expect(mergeEnv("", { A: "1" })).toBe("# Added by the VHQ setup screen\nA=1\n");
  });
  it("is safe to run twice (no duplicate lines)", () => {
    const once = mergeEnv("", { A: "1", B: "2" });
    expect(mergeEnv(once, { A: "1", B: "2" })).toBe(once);
  });
});

describe("env values survive the real Next.js loader", () => {
  it("keeps $, #, spaces and & exactly as typed", () => {
    const tricky = { MONGODB_URI: "mongodb+srv://u:p%40ss$word@c.mongodb.net/vhq?retryWrites=true&w=majority", GEMINI_API_KEY: "a#b c d", SESSION_SECRET: "abc+/=", PLAIN: "x" };
    const dir = mkdtempSync(path.join(tmpdir(), "vhq-env-"));
    writeFileSync(path.join(dir, ".env.local"), mergeEnv("", tricky));
    const env = process.env as Record<string, string | undefined>;
    const keep = Object.fromEntries(Object.keys(tricky).map((k) => [k, env[k]]));
    const mode = env.NODE_ENV;
    for (const k of Object.keys(tricky)) delete env[k];
    env.NODE_ENV = "development"; // under tests Next skips .env.local, so act like `npm run dev`
    try {
      loadEnvConfig(dir, true, { info: () => {}, error: () => {} }, true);
      for (const [k, val] of Object.entries(tricky)) expect(env[k]).toBe(val);
    } finally {
      env.NODE_ENV = mode;
      for (const [k, val] of Object.entries(keep)) { if (val === undefined) delete env[k]; else env[k] = val; }
    }
  });
  it("formatValue leaves simple values plain", () => {
    expect(formatValue("abc123")).toBe("abc123");
    expect(formatValue("a b")).toBe('"a b"');
  });
});

describe("buildUpdates", () => {
  it("creates the two secrets and an address when missing, and the local app address", () => {
    const u = buildUpdates({}, "", null);
    expect(u.SESSION_SECRET).toBeTruthy();
    expect(u.SERVICE_CRED_KEY).toBeTruthy();
    expect(u.ADMIN_ROUTE_SLUG).toMatch(/^[a-f0-9]{18}$/);
    expect(u.APP_URL).toMatch(/^http:\/\/localhost:3000$/);
    expect(u.MONGODB_URI).toBeUndefined(); // empty boxes never write or erase anything
  });
  it("never replaces secrets that already exist (SERVICE_CRED_KEY protects the 2FA secret)", () => {
    const existing = "SESSION_SECRET=keep1\nSERVICE_CRED_KEY=keep2\nADMIN_ROUTE_SLUG=my-door-123\nAPP_URL=https://x.y\n";
    const u = buildUpdates({ mongoUri: "mongodb://h/db" }, existing, null);
    expect(u).toEqual({ MONGODB_URI: "mongodb://h/db" });
  });
  it("writes what was typed, trimmed, and the password hash only when a password was given", () => {
    const u = buildUpdates({ mongoUri: " mongodb://h/db ", cloudName: "c", cloudApiKey: "k", cloudApiSecret: "s", geminiKey: "g", officeSlug: "my-door-123", appUrl: "https://a.b/" }, "", "b64:HASH");
    expect(u).toMatchObject({ MONGODB_URI: "mongodb://h/db", CLOUDINARY_CLOUD_NAME: "c", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s", GEMINI_API_KEY: "g", ADMIN_ROUTE_SLUG: "my-door-123", ADMIN_BOOTSTRAP_HASH: "b64:HASH", APP_URL: "https://a.b" });
    expect(buildUpdates({}, "ADMIN_ROUTE_SLUG=x\nSESSION_SECRET=a\nSERVICE_CRED_KEY=b\nAPP_URL=u", null).ADMIN_BOOTSTRAP_HASH).toBeUndefined();
  });
  it("presentKeys ignores empty values", () => {
    expect([...presentKeys("A=1\nB=\nC=\"\"\n# D=4\nexport E=5")].sort()).toEqual(["A", "E"]);
  });
});

describe("setup guard", () => {
  it("only loopback hosts count as local", () => {
    for (const h of ["localhost", "localhost:3000", "127.0.0.1:4000", "[::1]:3000"]) expect(isLoopbackHost(h)).toBe(true);
    for (const h of ["192.168.1.5:3000", "example.com", "localhost.evil.com", "", null, undefined]) expect(isLoopbackHost(h)).toBe(false);
  });
  it("does not exist in production unless explicitly enabled, and never for a non-local host", () => {
    const env = process.env as Record<string, string | undefined>;
    const saved = { n: env.NODE_ENV, e: env.ENABLE_SETUP_WIZARD };
    try {
      env.NODE_ENV = "production"; delete env.ENABLE_SETUP_WIZARD;
      expect(setupEnabled()).toBe(false);
      expect(setupAllowedFor("localhost:3000")).toBe(false);
      env.NODE_ENV = "development";
      expect(setupAllowedFor("localhost:3000")).toBe(true);
      expect(setupAllowedFor("192.168.1.5:3000")).toBe(false);
      env.NODE_ENV = "production"; env.ENABLE_SETUP_WIZARD = "true";
      expect(setupAllowedFor("127.0.0.1:3000")).toBe(true);
    } finally {
      if (saved.n === undefined) delete env.NODE_ENV; else env.NODE_ENV = saved.n;
      if (saved.e === undefined) delete env.ENABLE_SETUP_WIZARD; else env.ENABLE_SETUP_WIZARD = saved.e;
    }
  });
  it("accepts only the right code", () => {
    const c = setupCode();
    expect(c).toMatch(/^[a-f0-9]{8}$/);
    expect(setupCode()).toBe(c); // stable for the whole server run
    expect(codeMatches(c)).toBe(true);
    expect(codeMatches(c.toUpperCase())).toBe(true);
    for (const bad of ["", "00000000", c.slice(1), undefined, null, 5]) expect(codeMatches(bad)).toBe(false);
  });
});
