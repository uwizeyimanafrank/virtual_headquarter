// Small icons that float in the background (P11-T08). Pure data and pure layout maths, so it can be tested.
// Icons are drawn as SVG strokes on a 24x24 grid (emoji look different on every phone, so icons are the default).

export type FloatIcon = { key: string; label: string; d: string };

export const ICONS: readonly FloatIcon[] = [
  { key: "code", label: "Code", d: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" },
  { key: "terminal", label: "Terminal", d: "M4 6l6 6-6 6M12 18h8" },
  { key: "braces", label: "Braces", d: "M9 4c-2 0-3 1-3 3v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 2 1 3 3 3M15 4c2 0 3 1 3 3v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 2-1 3-3 3" },
  { key: "shield", label: "Shield", d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" },
  { key: "lock", label: "Lock", d: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3" },
  { key: "key", label: "Key", d: "M14 10a4 4 0 11-1-2.6L21 15v3h-3v-2h-2l-2-2" },
  { key: "bolt", label: "Bolt", d: "M13 2L4 14h7l-1 8 9-12h-7z" },
  { key: "branch", label: "Branch", d: "M6 4v12M6 16a3 3 0 100 6 3 3 0 000-6zM18 8a3 3 0 100-6 3 3 0 000 6zM18 8c0 6-6 4-12 8" },
  { key: "database", label: "Database", d: "M4 6c0-2 3.5-3 8-3s8 1 8 3-3.5 3-8 3-8-1-8-3zM4 6v12c0 2 3.5 3 8 3s8-1 8-3V6M4 12c0 2 3.5 3 8 3s8-1 8-3" },
  { key: "cloud", label: "Cloud", d: "M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18z" },
  { key: "cpu", label: "Chip", d: "M7 7h10v10H7zM10 10h4v4h-4zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" },
  { key: "globe", label: "Globe", d: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" },
  { key: "star", label: "Star", d: "M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.3 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" },
  { key: "eye", label: "Eye", d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z" },
  { key: "moon", label: "Moon", d: "M20 14A8 8 0 0110 4a8 8 0 1010 10z" },
  { key: "hex", label: "Hexagon", d: "M12 3l8 4.5v9L12 21l-8-4.5v-9z" },
];

export const ICON_BY_KEY = new Map(ICONS.map((i) => [i.key, i]));
export const MAX_FLOATING = 16;
export const PALETTE = ["#2dd4bf", "#6d5dfc", "#f59e0b", "#f472b6", "#7ef0dc"] as const;

/** Small, fast, repeatable random numbers (0 to 1). The same seed always gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An owner-chosen emoji or short symbol (not one of our icon keys). */
export const isGlyphText = (s: string) => !ICON_BY_KEY.has(s) && s.trim().length > 0 && [...s.trim()].length <= 4;

export type FloatItem = {
  id: number; glyph: string; x: number; y: number; size: number; depth: number; opacity: number;
  duration: number; delay: number; dx: number; dy: number; rotate: number; color: string;
};

/** How many items to show: fewer on small screens and when the visitor asked to save data. */
export function chooseCount(requested: number, viewportWidth: number, saveData = false): number {
  const cap = saveData ? 5 : viewportWidth < 640 ? 8 : MAX_FLOATING;
  return Math.max(0, Math.min(Math.floor(requested) || 0, cap, MAX_FLOATING));
}

/**
 * Picks random positions (x, y in percent) for the items, keeping them away from the edges and from each
 * other. Near items (depth close to 1) are bigger, brighter and move faster.
 */
export function layoutItems(glyphs: readonly string[], count: number, rand: () => number): FloatItem[] {
  const pool = glyphs.filter((g) => ICON_BY_KEY.has(g) || isGlyphText(g));
  const n = Math.min(Math.max(0, Math.floor(count)), MAX_FLOATING);
  if (pool.length === 0 || n === 0) return [];
  const placed: { x: number; y: number }[] = [];
  const out: FloatItem[] = [];
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 40; tries++) {
      x = 4 + rand() * 92;
      y = 6 + rand() * 88;
      if (placed.every((p) => Math.hypot(p.x - x, (p.y - y) * 0.6) >= 11)) break; // y counts less: screens are wider than tall
    }
    placed.push({ x, y });
    const depth = 0.3 + rand() * 0.7;
    out.push({
      id: i,
      glyph: pool[Math.floor(rand() * pool.length)],
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      size: Math.round(16 + depth * 26),
      depth: Math.round(depth * 100) / 100,
      opacity: Math.round((0.22 + depth * 0.4) * 100) / 100,
      duration: Math.round((34 - depth * 16 + rand() * 8) * 10) / 10,
      delay: -Math.round(rand() * 30 * 10) / 10, // negative: already mid-float when the page loads
      dx: Math.round((rand() - 0.5) * (30 + depth * 50)),
      dy: Math.round((rand() - 0.5) * (30 + depth * 50)),
      rotate: Math.round((rand() - 0.5) * 50),
      color: PALETTE[Math.floor(rand() * PALETTE.length)],
    });
  }
  return out;
}
