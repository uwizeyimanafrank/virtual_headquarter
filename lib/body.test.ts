// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readJsonLimited } from "@/lib/body";

const req = (body: string, headers: Record<string, string> = {}) => new Request("http://example.test/x", { method: "POST", body, headers });

describe("readJsonLimited", () => {
  it("reads normal JSON", async () => {
    expect(await readJsonLimited(req('{"a":1}'))).toEqual({ ok: true, data: { a: 1 } });
  });
  it("answers 400 for text that is not JSON", async () => {
    expect(await readJsonLimited(req("hello"))).toEqual({ ok: false, status: 400 });
  });
  it("answers 413 when the announced size is too big, without reading the body", async () => {
    expect(await readJsonLimited(req("{}", { "content-length": "999999" }), 1000)).toEqual({ ok: false, status: 413 });
  });
  it("answers 413 when the real size is too big even if nothing was announced", async () => {
    expect(await readJsonLimited(req(JSON.stringify({ x: "y".repeat(2000) })), 1000)).toEqual({ ok: false, status: 413 });
  });
  it("counts bytes, not characters", async () => {
    const wide = JSON.stringify({ x: "\u00e9".repeat(600) }); // 600 characters but about 1200 bytes
    expect(await readJsonLimited(req(wide), 1000)).toEqual({ ok: false, status: 413 });
  });
});
