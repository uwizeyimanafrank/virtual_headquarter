// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BLOCK_DEFS, moveBlock, resolveBlocks, validateBlocksInput, visibleBlocks } from "@/lib/home-blocks";

describe("block registry", () => {
  it("has unique keys, one required hero first, and every field has a label, limit and default within it", () => {
    expect(new Set(BLOCK_DEFS.map((b) => b.key)).size).toBe(BLOCK_DEFS.length);
    expect(BLOCK_DEFS[0]).toMatchObject({ key: "hero", required: true, ready: true });
    for (const b of BLOCK_DEFS) {
      expect(b.label.length).toBeGreaterThan(2); expect(b.description.length).toBeGreaterThan(10);
      for (const fld of b.fields) { expect(fld.label.length).toBeGreaterThan(2); expect(fld.default.length).toBeLessThanOrEqual(fld.max); }
    }
  });
  it("lists every block the plan promised", () => {
    for (const k of ["hero", "stats", "whatIBuild", "journey", "featured", "cardWall", "dispatches", "gallery", "hire", "avatar", "now"]) expect(BLOCK_DEFS.some((b) => b.key === k), k).toBe(true);
  });
});

describe("resolveBlocks", () => {
  it("with nothing saved gives every block in registry order with defaults (also the no-database case)", () => {
    const r = resolveBlocks(null);
    expect(r.map((b) => b.key)).toEqual(BLOCK_DEFS.map((b) => b.key));
    expect(r.map((b) => b.order)).toEqual(r.map((_, i) => i));
    expect(r.every((b) => b.enabled)).toBe(true);
    expect(r.find((b) => b.key === "hire")!.content.button).toBe("Hire me");
  });
  it("applies the owner's order, switches and text, and keeps the rest default", () => {
    const r = resolveBlocks([
      { key: "hire", order: 0, enabled: true, content: { title: "Hire Frank" } },
      { key: "hero", order: 1 },
      { key: "stats", order: 2, enabled: false },
    ]);
    expect(r.slice(0, 3).map((b) => b.key)).toEqual(["hire", "hero", "stats"]);
    expect(r[0].content.title).toBe("Hire Frank");
    expect(r[0].content.button).toBe("Hire me"); // not given, so default
    expect(r.find((b) => b.key === "stats")!.enabled).toBe(false);
  });
  it("never lets the required block be switched off, and drops unknown or repeated blocks", () => {
    const r = resolveBlocks([{ key: "hero", enabled: false }, { key: "nope" }, { key: "stats", content: { title: "A" } }, { key: "stats", content: { title: "B" } }]);
    expect(r.find((b) => b.key === "hero")!.enabled).toBe(true);
    expect(r.some((b) => b.key === "nope")).toBe(false);
    expect(r.filter((b) => b.key === "stats")).toHaveLength(1);
    expect(r.find((b) => b.key === "stats")!.content.title).toBe("A"); // the first one wins
  });
  it("replaces text that is not text or is too long with the default, and trims", () => {
    const r = resolveBlocks([{ key: "stats", content: { title: "  Numbers  ", stat1Value: 5, stat1Label: "x".repeat(500) } }]);
    const s = r.find((b) => b.key === "stats")!;
    expect(s.content.title).toBe("Numbers");
    expect(s.content.stat1Value).toBe("2");
    expect(s.content.stat1Label).toBe("Internships");
  });
  it("survives garbage from the database", () => {
    for (const bad of [undefined, 5, "x", {}, [null, 3, "x", { key: 7 }]]) expect(resolveBlocks(bad as never).length).toBe(BLOCK_DEFS.length);
  });
});

describe("visibleBlocks", () => {
  it("shows only blocks that are on AND built (today only the hero)", () => {
    expect(visibleBlocks(resolveBlocks(null)).map((b) => b.key)).toEqual(["hero"]);
    const all = BLOCK_DEFS.map((b) => ({ key: b.key, enabled: true, order: 0 }));
    expect(visibleBlocks(resolveBlocks(all)).every((b) => b.ready)).toBe(true);
  });
});

describe("validateBlocksInput", () => {
  const ok = [{ key: "hero", enabled: true }, { key: "stats", enabled: false, content: { title: " Hi " } }];
  it("accepts a good list and uses the position as the order", () => {
    expect(validateBlocksInput(ok)).toEqual({ ok: true, blocks: [{ key: "hero", enabled: true, order: 0, content: {} }, { key: "stats", enabled: false, order: 1, content: { title: "Hi" } }] });
  });
  it("refuses the usual mistakes with a clear message", () => {
    const bad = (x: unknown) => { const r = validateBlocksInput(x); return r.ok ? "ok" : r.error; };
    expect(bad(null)).toMatch(/list/); expect(bad([])).toMatch(/list/);
    expect(bad([{ key: "nope", enabled: true }])).toMatch(/not known/);
    expect(bad([{ key: "hero", enabled: true }, { key: "hero", enabled: true }])).toMatch(/twice/);
    expect(bad([{ key: "stats" }])).toMatch(/on or off/);
    expect(bad([{ key: "hero", enabled: false }])).toMatch(/cannot be switched off/);
    expect(bad([{ key: "stats", enabled: true, content: { nothing: "x" } }])).toMatch(/no field/);
    expect(bad([{ key: "stats", enabled: true, content: { title: 5 } }])).toMatch(/must be text/);
    expect(bad([{ key: "stats", enabled: true, content: { title: "x".repeat(61) } }])).toMatch(/too long/);
    expect(bad([{ key: "stats", enabled: true, content: [] }])).toMatch(/not valid/);
    expect(bad(Array.from({ length: 99 }, () => ({ key: "hero", enabled: true })))).toMatch(/list/);
  });
});

describe("moveBlock", () => {
  const l = [{ key: "a" }, { key: "b" }, { key: "c" }];
  it("moves a block and leaves the list alone at the ends", () => {
    expect(moveBlock(l, "b", -1).map((x) => x.key)).toEqual(["b", "a", "c"]);
    expect(moveBlock(l, "b", 1).map((x) => x.key)).toEqual(["a", "c", "b"]);
    expect(moveBlock(l, "a", -1).map((x) => x.key)).toEqual(["a", "b", "c"]);
    expect(moveBlock(l, "c", 1).map((x) => x.key)).toEqual(["a", "b", "c"]);
    expect(moveBlock(l, "zzz", 1).map((x) => x.key)).toEqual(["a", "b", "c"]);
  });
  it("does not change the original", () => { moveBlock(l, "a", 1); expect(l.map((x) => x.key)).toEqual(["a", "b", "c"]); });
});
