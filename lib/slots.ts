import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { resolveSlots, type ResolvedSlot } from "@/lib/image-slots";
import { ImageSlot } from "@/models/ImageSlot";

export const SLOTS_TAG = "slots";

/** Every slot with the owner's replacement or the default. Never throws: with no database it returns the defaults. */
export async function getSlots(): Promise<Record<string, ResolvedSlot>> {
  "use cache";
  cacheTag(SLOTS_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  try {
    await connectDb();
    const docs = await ImageSlot.find({}).lean();
    return resolveSlots(docs.map((d) => ({ key: d.key, url: d.url, alt: d.alt, focal: d.focal, credit: d.credit, license: d.license, kind: d.kind })));
  } catch (err) {
    console.error("image slots unavailable, using defaults:", err instanceof Error ? err.message : "unknown error");
    return resolveSlots([]);
  }
}

export async function getSlot(key: string): Promise<ResolvedSlot | undefined> {
  return (await getSlots())[key];
}

/** Call after the owner changes a slot so the public site updates. */
export function revalidateSlots(): void {
  revalidateTag(SLOTS_TAG, { expire: 0 });
}
