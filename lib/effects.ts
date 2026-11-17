// Look-and-feel switches (P11-T17). Pure part: names, defaults, cleaning. The reader below talks to the database.

export const EFFECT_KEYS = ["scrollProgress", "cursorGlow", "reveal", "floatingItems", "movingScenes"] as const;
export type EffectKey = (typeof EFFECT_KEYS)[number];
export type Effects = Record<EffectKey, boolean>;

/** Shown in the Office next to each switch. */
export const EFFECT_LABELS: Record<EffectKey, { label: string; hint: string }> = {
  scrollProgress: { label: "Scroll progress bar", hint: "A thin line at the top that fills as people scroll." },
  cursorGlow: { label: "Cursor glow", hint: "A soft light that follows the mouse (desktop only)." },
  reveal: { label: "Section reveal", hint: "Sections fade in as they scroll into view." },
  floatingItems: { label: "Floating items", hint: "The small icons drifting behind the hero." },
  movingScenes: { label: "Moving scenes", hint: "The slow movement inside the drawn scenes." },
};

/** Everything is on until the owner switches it off. */
export const DEFAULT_EFFECTS: Effects = { scrollProgress: true, cursorGlow: true, reveal: true, floatingItems: true, movingScenes: true };

/** Only a real `false` turns an effect off; anything missing or odd keeps the default (on). */
export function normalizeEffects(raw: unknown): Effects {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(EFFECT_KEYS.map((k) => [k, src[k] === false ? false : true])) as Effects;
}

/** CSS that switches off the effects that are done in CSS. Plain text made only from our own constants (no user text). */
export function effectsCss(e: Effects): string {
  const rules: string[] = [];
  if (!e.reveal) rules.push("[data-block]{animation:none !important;opacity:1 !important;transform:none !important}");
  if (!e.floatingItems) rules.push(".ff{display:none !important}");
  if (!e.movingScenes) rules.push(".scene *,.ff-item{animation:none !important}");
  return rules.join("");
}
