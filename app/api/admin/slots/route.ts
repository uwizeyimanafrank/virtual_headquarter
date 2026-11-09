import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { SLOTS, isAllowedPictureUrl, slotPagePath } from "@/lib/image-slots";
import { ImageSlot } from "@/models/ImageSlot";
import { MuseumItem } from "@/models/MuseumItem";

const NO_STORE = { "Cache-Control": "no-store" };

/** Everything the Office > Images screen needs: all slots with the owner's replacement (if any), and pictures already on the site. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  const [docs, items] = await Promise.all([ImageSlot.find({}).lean(), MuseumItem.find({}).select("mediaUrl").lean()]);
  const byKey = new Map(docs.map((d) => [d.key, d]));
  const slots = SLOTS.map((d) => {
    const c = byKey.get(d.key);
    return { ...d, path: slotPagePath(d), custom: c ? { url: c.url, alt: c.alt ?? "", focal: { x: c.focal?.x ?? 50, y: c.focal?.y ?? 50 }, credit: c.credit ?? "", license: c.license ?? "", kind: c.kind, updatedAt: c.updatedAt } : null };
  });
  const library = [...new Set([...docs.map((d) => d.url), ...items.map((i) => i.mediaUrl)])].filter(isAllowedPictureUrl).slice(0, 60);
  return Response.json({ slots, library }, { headers: NO_STORE });
}
