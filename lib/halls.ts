// The Museum's two halls and how the address bar names them (P12-T02). Pure, so it is easy to test.

export const HALLS = ["tour", "cases"] as const;
export type Hall = (typeof HALLS)[number];

export const HALL_LABELS: Record<Hall, { title: string; hint: string }> = {
  tour: { title: "Story Tour", hint: "Walk through the story in order" },
  cases: { title: "Glass Cases", hint: "Step closer to each piece" },
};

/** "#cases" and a shared piece ("#case=<id>") open the Glass Cases; anything else is the Story Tour. */
export function hallFromHash(hash: string): Hall {
  return hash === "#cases" || hash.startsWith("#case=") ? "cases" : "tour";
}

/** The address-bar hash for a hall. The Story Tour has none (plain /museum). */
export const hashForHall = (h: Hall) => (h === "cases" ? "#cases" : "");

/** Left/Right (and Home/End) move between the two doors, like any tab list. */
export function nextHall(current: Hall, key: string): Hall | null {
  const i = HALLS.indexOf(current);
  if (key === "ArrowRight" || key === "ArrowDown") return HALLS[(i + 1) % HALLS.length];
  if (key === "ArrowLeft" || key === "ArrowUp") return HALLS[(i + HALLS.length - 1) % HALLS.length];
  if (key === "Home") return HALLS[0];
  if (key === "End") return HALLS[HALLS.length - 1];
  return null;
}

/** The share link of one piece: "#case=<id>". */
export const caseHash = (id: string) => `#case=${encodeURIComponent(id)}`;

/** The piece named in an address-bar hash, or null. */
export function caseIdFromHash(hash: string): string | null {
  if (!hash.startsWith("#case=")) return null;
  try {
    return decodeURIComponent(hash.slice(6)) || null;
  } catch {
    return null;
  }
}

/** The pictures of a piece for the detail panel: the main picture first, then the gallery, no empty entries or repeats. */
export function panelImages(item: { mediaUrl: string; gallery: readonly string[] }): string[] {
  return [...new Set([item.mediaUrl, ...item.gallery].filter(Boolean))];
}

/** The piece before or after this one in the list (wraps around). Null when the id is unknown or there is only one piece. */
export function neighbour<T extends { id: string }>(items: readonly T[], id: string, step: 1 | -1): T | null {
  const i = items.findIndex((x) => x.id === id);
  if (i < 0 || items.length < 2) return null;
  return items[(i + step + items.length) % items.length];
}
