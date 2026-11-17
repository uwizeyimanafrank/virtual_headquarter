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
