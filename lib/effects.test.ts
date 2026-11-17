import { describe, expect, it } from "vitest";
import { DEFAULT_EFFECTS, EFFECT_KEYS, EFFECT_LABELS, effectsCss, normalizeEffects } from "@/lib/effects";

describe("effects", () => {
  it("is all on by default and for missing or odd data", () => {
    expect(normalizeEffects(undefined)).toEqual(DEFAULT_EFFECTS);
    expect(normalizeEffects(null)).toEqual(DEFAULT_EFFECTS);
    expect(normalizeEffects({ reveal: "no", cursorGlow: 0 })).toEqual(DEFAULT_EFFECTS);
  });
  it("only a real false switches one off", () => {
    expect(normalizeEffects({ cursorGlow: false })).toEqual({ ...DEFAULT_EFFECTS, cursorGlow: false });
  });
  it("every switch has a label and a hint", () => {
    for (const k of EFFECT_KEYS) expect(EFFECT_LABELS[k].label && EFFECT_LABELS[k].hint).toBeTruthy();
  });
  it("adds no CSS when everything is on, and the matching rule for each CSS effect that is off", () => {
    expect(effectsCss(DEFAULT_EFFECTS)).toBe("");
    expect(effectsCss({ ...DEFAULT_EFFECTS, reveal: false })).toContain("[data-block]");
    expect(effectsCss({ ...DEFAULT_EFFECTS, floatingItems: false })).toContain(".ff{display:none");
    expect(effectsCss({ ...DEFAULT_EFFECTS, movingScenes: false })).toContain(".scene *");
    expect(effectsCss({ ...DEFAULT_EFFECTS, scrollProgress: false, cursorGlow: false })).toBe("");
  });
});
