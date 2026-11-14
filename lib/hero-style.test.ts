// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_MOOD, heroMasks, moodFrom, moodStyle, percent, sanitizeSide } from "@/lib/hero-style";

describe("hero style", () => {
  it("only left or right for the side", () => {
    expect(sanitizeSide("left")).toBe("left");
    for (const v of ["right", "LEFT", "middle", "", null, undefined, 5]) expect(sanitizeSide(v)).toBe("right");
  });
  it("percent reads typed numbers safely", () => {
    expect(percent("40", 1)).toBe(40);
    expect(percent(" 7.6 ", 1)).toBe(8);
    expect(percent("-5", 1)).toBe(0);
    expect(percent("900", 1)).toBe(100);
    for (const v of ["", "abc", null, undefined, {}, Number.NaN]) expect(percent(v, 33)).toBe(33);
  });
  it("moodFrom uses defaults for anything missing or wrong", () => {
    expect(moodFrom({})).toEqual(DEFAULT_MOOD);
    expect(moodFrom({ darken: "50", tint: "x", grain: "0", vignette: "100" })).toEqual({ darken: 50, tint: DEFAULT_MOOD.tint, grain: 0, vignette: 100 });
  });
  it("moodStyle: more darken means darker, zero tint and grain draw nothing, everything stays in range", () => {
    expect(moodStyle({ darken: 0, tint: 0, grain: 0, vignette: 0 })).toEqual({ filter: "brightness(1.000) contrast(1.08) saturate(0.85)", tintOpacity: 0, grainOpacity: 0, vignetteOpacity: 0 });
    expect(moodStyle({ darken: 100, tint: 100, grain: 100, vignette: 100 })).toMatchObject({ filter: "brightness(0.500) contrast(1.08) saturate(0.85)", tintOpacity: 0.45, grainOpacity: 0.35, vignetteOpacity: 0.9 });
  });
  it("masks fade the edge that faces the text, and the bottom", () => {
    expect(heroMasks("right").maskImage).toMatch(/^linear-gradient\(to right, transparent 0%, #000 42%\)/);
    expect(heroMasks("left").maskImage).toMatch(/^linear-gradient\(to left, transparent 0%, #000 42%\)/);
    expect(heroMasks("right").maskImage).toContain("to left, transparent 0%, #000 6%"); // outer edge fades too
    for (const s of ["left", "right"] as const) { const m = heroMasks(s); expect(m.maskImage).toContain("to top"); expect(m.WebkitMaskImage).toBe(m.maskImage); expect(m.maskComposite).toBe("intersect"); }
  });
});
