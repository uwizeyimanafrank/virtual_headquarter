// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ICONS, MAX_FLOATING, chooseCount, isGlyphText, layoutItems, seededRandom } from "@/lib/floating-icons";

const keys = ICONS.map((i) => i.key);

describe("icons", () => {
  it("are unique, labelled and drawn", () => {
    expect(new Set(keys).size).toBe(ICONS.length);
    for (const i of ICONS) { expect(i.label.length).toBeGreaterThan(2); expect(i.d).toMatch(/^M[\d\s.,MmLlHhVvCcSsQqTtAaZz-]+$/); }
  });
});

describe("seededRandom", () => {
  it("is repeatable and stays between 0 and 1", () => {
    const a = seededRandom(42), b = seededRandom(42), c = seededRandom(43);
    const xs = Array.from({ length: 50 }, a);
    expect(xs).toEqual(Array.from({ length: 50 }, b));
    expect(xs).not.toEqual(Array.from({ length: 50 }, c));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe("chooseCount", () => {
  it("never passes 16, gives fewer on phones and with Save-Data, and survives nonsense", () => {
    expect(chooseCount(99, 1440)).toBe(MAX_FLOATING);
    expect(chooseCount(12, 1440)).toBe(12);
    expect(chooseCount(12, 390)).toBe(8);
    expect(chooseCount(12, 1440, true)).toBe(5);
    for (const bad of [-3, Number.NaN, 0]) expect(chooseCount(bad, 1440)).toBe(0);
  });
});

describe("layoutItems", () => {
  const items = layoutItems(keys, 16, seededRandom(7));
  it("makes the requested number, capped at 16", () => {
    expect(items).toHaveLength(16);
    expect(layoutItems(keys, 99, seededRandom(1))).toHaveLength(MAX_FLOATING);
    expect(layoutItems(keys, 0, seededRandom(1))).toEqual([]);
    expect(layoutItems([], 5, seededRandom(1))).toEqual([]);
  });
  it("keeps every item inside the box, away from the edges", () => {
    for (const it of items) { expect(it.x).toBeGreaterThanOrEqual(4); expect(it.x).toBeLessThanOrEqual(96); expect(it.y).toBeGreaterThanOrEqual(6); expect(it.y).toBeLessThanOrEqual(94); }
  });
  it("spreads them out so they do not pile up", () => {
    const close = items.filter((a, i) => items.some((b, j) => j > i && Math.hypot(a.x - b.x, (a.y - b.y) * 0.6) < 6));
    expect(close.length).toBeLessThanOrEqual(1);
  });
  it("makes near items bigger and brighter than far ones", () => {
    const sorted = [...items].sort((a, b) => a.depth - b.depth);
    expect(sorted[sorted.length - 1].size).toBeGreaterThan(sorted[0].size);
    expect(sorted[sorted.length - 1].opacity).toBeGreaterThan(sorted[0].opacity);
    for (const it of items) { expect(it.opacity).toBeLessThan(0.7); expect(it.delay).toBeLessThanOrEqual(0); expect(it.duration).toBeGreaterThan(10); }
  });
  it("is the same for the same seed and different for another", () => {
    expect(layoutItems(keys, 10, seededRandom(5))).toEqual(layoutItems(keys, 10, seededRandom(5)));
    expect(layoutItems(keys, 10, seededRandom(5))).not.toEqual(layoutItems(keys, 10, seededRandom(6)));
  });
  it("accepts owner emoji, and drops anything that is neither an icon nor a short symbol", () => {
    const r = layoutItems(["🌙", "code", "this is far too long to be a symbol", "   ", ""], 8, seededRandom(3));
    expect(new Set(r.map((i) => i.glyph))).toEqual(new Set(["🌙", "code"]));
    expect(isGlyphText("🌙")).toBe(true);
    expect(isGlyphText("code")).toBe(false);
  });
});
