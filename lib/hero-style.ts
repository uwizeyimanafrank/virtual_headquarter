// Pure helpers for the hero's look (P11-T10): which side the character sits on, the "mood filter" for photos the
// owner uploads, and the fade masks that leave the character half in shadow. CSS only, no 3D.

export type HeroSide = "left" | "right";
export const sanitizeSide = (v: unknown): HeroSide => (v === "left" ? "left" : "right");

/** A 0 to 100 number from text the owner typed. Anything else becomes the fallback. */
export function percent(v: unknown, fallback: number): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

export type Mood = { darken: number; tint: number; grain: number; vignette: number };
export const DEFAULT_MOOD: Mood = { darken: 20, tint: 25, grain: 30, vignette: 55 };

export function moodFrom(content: Record<string, unknown>): Mood {
  return {
    darken: percent(content.darken, DEFAULT_MOOD.darken),
    tint: percent(content.tint, DEFAULT_MOOD.tint),
    grain: percent(content.grain, DEFAULT_MOOD.grain),
    vignette: percent(content.vignette, DEFAULT_MOOD.vignette),
  };
}

/** What to draw over and on the character picture so any photo gets the same low-key, teal-lit mood. */
export function moodStyle(m: Mood) {
  return {
    filter: `brightness(${(1 - m.darken / 200).toFixed(3)}) contrast(1.08) saturate(0.85)`,
    tintOpacity: Number((m.tint / 100 * 0.45).toFixed(3)), // a cold teal wash
    grainOpacity: Number((m.grain / 100 * 0.35).toFixed(3)),
    vignetteOpacity: Number((m.vignette / 100 * 0.9).toFixed(3)),
  };
}

/**
 * Masks that fade the character into the dark: the edge facing the text and the bottom melt away, so only
 * the light on the shoulders and hands shows. Written both standard and with the WebKit prefix.
 */
export function heroMasks(side: HeroSide) {
  const toward = side === "right" ? "to right" : "to left"; // transparent at the text edge, solid further in
  const away = side === "right" ? "to left" : "to right"; // a short fade at the outer edge too, so the picture never ends in a hard line
  const image = `linear-gradient(${toward}, transparent 0%, #000 42%), linear-gradient(${away}, transparent 0%, #000 6%), linear-gradient(to top, transparent 0%, #000 34%)`;
  return { maskImage: image, WebkitMaskImage: image, maskComposite: "intersect", WebkitMaskComposite: "source-in" } as const;
}
