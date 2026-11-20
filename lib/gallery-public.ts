import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { buildGallery, type GalleryChapter } from "@/lib/gallery";
import { Album } from "@/models/Album";
import { GalleryImage } from "@/models/GalleryImage";

export const GALLERY_TAG = "gallery";

export type GalleryData = { chapters: GalleryChapter[]; demo: boolean };

// Bundled drawings used only while the database is not connected, so the page never looks broken on a fresh computer.
const DEMO = [
  ["story", "A drawn scene of a long road at dusk", "The road"], ["project", "A sketched laptop on a desk", "Late-night build"],
  ["book", "A stack of books with a lamp", "Reading list"], ["certificate", "A framed certificate on a wall", "Small win"], ["profile", "A hooded figure in soft shadow", "The one behind the screen"],
] as const;

/** Published pictures grouped into chapters. Cached 5 minutes and refreshed at once by every Office change (invalidateGallery). */
export async function getPublicGallery(): Promise<GalleryData> {
  "use cache";
  cacheTag(GALLERY_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  try {
    await connectDb();
    const [albums, images] = await Promise.all([Album.find({}).lean(), GalleryImage.find({ published: true }).lean()]);
    return { chapters: buildGallery(albums, images), demo: false };
  } catch (err) {
    console.error("gallery unavailable, showing demo pictures:", err instanceof Error ? err.message : "unknown error");
    const photos = DEMO.map(([name, alt, caption]) => ({ id: `demo-${name}`, src: `/samples/${name}.svg`, full: `/samples/${name}.svg`, blur: "", caption, alt, takenDate: "" }));
    return { chapters: [{ id: "", title: "", description: "", photos }], demo: true };
  }
}

/** Call after any gallery or album change in the Office. */
export function invalidateGallery() {
  revalidateTag(GALLERY_TAG, { expire: 0 });
}
