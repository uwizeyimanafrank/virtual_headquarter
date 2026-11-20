import { photoUrls } from "@/lib/media";

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

// ---------------------------------------------------------------- public wall

/** A picture as visitors get it: only resized links, never the stored original. */
export type PublicPhoto = { id: string; src: string; full: string; blur: string; caption: string; alt: string; takenDate: string };
/** A chapter of the wall. id "" = pictures that are in no album. */
export type GalleryChapter = { id: string; title: string; description: string; photos: PublicPhoto[] };

type AlbumRow = { _id: unknown; title: string; description?: string | null; order?: number | null };
type ImageRow = { _id: unknown; imageUrl: string; caption?: string | null; alt: string; album?: unknown; takenDate?: Date | null; order?: number | null; published?: boolean | null };

/**
 * Chapters for the public wall: albums in their order (each with its published pictures in order),
 * then the pictures with no album. Unpublished pictures never appear, and an album with nothing to show is left out.
 * A picture whose album no longer exists counts as having no album.
 */
export function buildGallery(albums: readonly AlbumRow[], images: readonly ImageRow[]): GalleryChapter[] {
  const byOrder = <T extends { order?: number | null }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);
  const live = images.filter((i) => i.published).sort(byOrder);
  const photo = (i: ImageRow): PublicPhoto => ({ id: String(i._id), ...photoUrls(i.imageUrl), caption: i.caption ?? "", alt: i.alt, takenDate: i.takenDate ? new Date(i.takenDate).toISOString().slice(0, 10) : "" });
  const known = new Set(albums.map((a) => String(a._id)));
  const chapters: GalleryChapter[] = [...albums].sort(byOrder)
    .map((a) => ({ id: String(a._id), title: a.title, description: a.description ?? "", photos: live.filter((i) => i.album && String(i.album) === String(a._id)).map(photo) }))
    .filter((c) => c.photos.length > 0);
  const loose = live.filter((i) => !i.album || !known.has(String(i.album))).map(photo);
  if (loose.length > 0) chapters.push({ id: "", title: "", description: "", photos: loose });
  return chapters;
}

/** A steady number from an id: the same picture always gets the same tilt and shape (no flicker, no server/browser mismatch). */
export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Slight tilt in degrees, between -3 and 3. */
export const tiltOf = (id: string) => (hashId(id) % 7) - 3;
const SHAPES = ["4 / 5", "1 / 1", "4 / 3", "3 / 4"] as const;
/** A picture shape picked from the id, so the phone layout looks like masonry and the space is reserved before the image loads. */
export const shapeOf = (id: string) => SHAPES[(hashId(id) >>> 3) % SHAPES.length];
