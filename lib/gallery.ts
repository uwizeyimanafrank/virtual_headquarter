// Small pure helpers for the gallery manager (P13-T05).

/** A new list with the item at `from` moved to position `to`. Out-of-range or same position returns the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Runs `fn` over every item with at most `limit` running at once. Results keep the order of the input.
 * Never rejects: each result says whether it worked, so one bad file does not stop the other nine.
 */
export async function runLimited<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<({ ok: true; value: R } | { ok: false; error: unknown })[]> {
  const results = new Array<{ ok: true; value: R } | { ok: false; error: unknown }>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try { results[i] = { ok: true, value: await fn(items[i], i) }; } catch (error) { results[i] = { ok: false, error }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}

/** The pictures a view shows: all of them, or one album, or the ones not in any album. Order is kept. */
export function inView<T extends { album: string }>(items: readonly T[], view: "all" | "none" | string): T[] {
  if (view === "all") return [...items];
  if (view === "none") return items.filter((i) => !i.album);
  return items.filter((i) => i.album === view);
}
