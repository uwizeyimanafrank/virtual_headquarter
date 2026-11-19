// Dispatches (P13-T01): short updates from the HQ. Pure helpers, so the
// "appears and expires on time" rules can be tested with a fake clock.

export const DISPATCH_KINDS = ["news", "building", "learning", "win", "note"] as const;
export type DispatchKind = (typeof DISPATCH_KINDS)[number];

/** The fields the rules need. Dates may be missing on old or draft items. */
export type DispatchLike = {
  published?: boolean;
  publishAt?: Date | null;
  expireAt?: Date | null;
  pinned?: boolean;
  date: Date;
};

/** Live = published, publish date reached (or none), and not expired (or no expiry). The expiry moment itself is already expired. */
export function isLive(d: DispatchLike, now: Date): boolean {
  if (!d.published) return false;
  if (d.publishAt && d.publishAt.getTime() > now.getTime()) return false;
  if (d.expireAt && d.expireAt.getTime() <= now.getTime()) return false;
  return true;
}

/** Only live items, pinned first, then newest date first. Does not change the input. */
export function selectLive<T extends DispatchLike>(items: T[], now: Date): T[] {
  return items
    .filter((d) => isLive(d, now))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.getTime() - a.date.getTime());
}

/** The kind from a query string, or null when it is not a known kind. */
export function parseKind(value: string | null): DispatchKind | null {
  return DISPATCH_KINDS.find((k) => k === value) ?? null;
}

export const KIND_LABELS: Record<DispatchKind, string> = { news: "News", building: "Building", learning: "Learning", win: "Win", note: "Note" };

/** "20 Nov 2026" in UTC, so the server and the browser always print the same text. */
export function formatDispatchDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
