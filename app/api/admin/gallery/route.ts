import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { toAdminAlbum, toAdminGalleryImage } from "@/lib/admin-gallery";
import { invalidateHome } from "@/lib/home";
import { galleryBatchInput } from "@/lib/validation";
import { Album } from "@/models/Album";
import { GalleryImage } from "@/models/GalleryImage";

/** Every picture (drafts too) and every album, in display order. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  const [images, albums] = await Promise.all([
    GalleryImage.find({}).sort({ order: 1, createdAt: 1 }).limit(2000).lean(),
    Album.find({}).sort({ order: 1, createdAt: 1 }).limit(200).lean(),
  ]);
  return Response.json({ images: images.map(toAdminGalleryImage), albums: albums.map(toAdminAlbum) }, { headers: { "Cache-Control": "no-store" } });
}

/** Add up to 20 pictures in one request. Each needs alt text. They go to the end, in the order sent. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = galleryBatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  await connectDb();
  const albumIds = [...new Set(parsed.data.images.map((i) => i.album).filter((a): a is string => !!a))];
  if (albumIds.length && (await Album.countDocuments({ _id: { $in: albumIds } })) !== albumIds.length) {
    return Response.json({ error: "That album does not exist." }, { status: 400 });
  }
  const last = await GalleryImage.findOne({}).sort({ order: -1 }).select("order").lean();
  const base = (last?.order ?? -1) + 1;
  const created = await GalleryImage.insertMany(parsed.data.images.map((i, n) => ({ ...i, takenDate: i.takenDate ? new Date(i.takenDate) : null, order: base + n })));
  invalidateHome();
  return Response.json({ images: created.map((d) => toAdminGalleryImage(d.toObject())) }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
