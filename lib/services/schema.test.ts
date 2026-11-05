// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCredentials, serviceCreate, serviceUpdate } from "@/lib/services/schema";

const ok = { name: "My site", type: "http", baseUrl: "https://example.org" };

describe("serviceCreate", () => {
  it("accepts a simple website check and fills defaults", () => {
    const r = serviceCreate.parse(ok);
    expect(r).toMatchObject({ healthPath: "/", enabled: true });
  });
  it("a website check needs an address; other kinds do not", () => {
    expect(serviceCreate.safeParse({ name: "x", type: "http" }).success).toBe(false);
    expect(serviceCreate.safeParse({ name: "db", type: "mongodb" }).success).toBe(true);
  });
  it("refuses addresses that are not plain web addresses", () => {
    for (const baseUrl of ["file:///etc/passwd", "javascript:alert(1)", "ftp://x.example", "https://user:pw@example.org", "example.org", ""]) {
      expect(serviceCreate.safeParse({ ...ok, baseUrl }).success).toBe(false);
    }
  });
  it("health path must start with a slash and have no spaces", () => {
    expect(serviceCreate.safeParse({ ...ok, healthPath: "health" }).success).toBe(false);
    expect(serviceCreate.safeParse({ ...ok, healthPath: "/a b" }).success).toBe(false);
    expect(serviceCreate.safeParse({ ...ok, healthPath: "/api/health" }).success).toBe(true);
  });
  it("needs a name, a known kind, and a sensible limit", () => {
    expect(serviceCreate.safeParse({ ...ok, name: "  " }).success).toBe(false);
    expect(serviceCreate.safeParse({ ...ok, type: "ftp" }).success).toBe(false);
    expect(serviceCreate.safeParse({ ...ok, limitMb: -5 }).success).toBe(false);
    expect(serviceCreate.safeParse({ ...ok, limitMb: 512 }).success).toBe(true);
    expect(serviceCreate.safeParse({ ...ok, name: "n".repeat(81) }).success).toBe(false);
  });
  it("strips invisible characters from the name", () => {
    expect(serviceCreate.parse({ ...ok, name: "Si\u0000te\u0007" }).name).toBe("Site");
  });
});

describe("serviceUpdate", () => {
  it("allows partial changes with no defaults added", () => {
    expect(serviceUpdate.parse({ enabled: false })).toEqual({ enabled: false });
  });
  it("can clear the limit", () => {
    expect(serviceUpdate.parse({ limitMb: null })).toEqual({ limitMb: null });
  });
});

describe("parseCredentials", () => {
  it("accepts exactly the right fields for each kind", () => {
    expect(parseCredentials("render", { apiKey: "rnd_abcdefgh", serviceId: "srv-abc12345" }).success).toBe(true);
    expect(parseCredentials("cloudinary", { cloudName: "demo", apiKey: "123456789", apiSecret: "abcdefgh1" }).success).toBe(true);
    expect(parseCredentials("mongodb", { uri: "mongodb+srv://u:p@cluster.example/db" }).success).toBe(true);
    expect(parseCredentials("http", { token: "abc" }).success).toBe(true);
  });
  it("refuses extra fields (strict), wrong shapes and the wrong kind's fields", () => {
    expect(parseCredentials("render", { apiKey: "rnd_abcdefgh", serviceId: "srv-abc12345", extra: "x" }).success).toBe(false);
    expect(parseCredentials("render", { apiKey: "rnd_abcdefgh", serviceId: "not-a-service" }).success).toBe(false);
    expect(parseCredentials("render", { token: "abc" }).success).toBe(false);
    expect(parseCredentials("mongodb", { uri: "http://example.org" }).success).toBe(false);
    expect(parseCredentials("cloudinary", { cloudName: "demo", apiKey: "abc", apiSecret: "abcdefgh1" }).success).toBe(false);
    expect(parseCredentials("http", {}).success).toBe(false);
  });
});
