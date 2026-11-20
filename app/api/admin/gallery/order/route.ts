import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { invalidateGallery } from "@/lib/gallery-public";
import { galleryOrderInput } from "@/lib/validation";
import { GalleryImage } from "@/models/GalleryImage";

/** Save a new order: the pictures listed get order 0, 1, 2 ... in the sequence sent. Pictures not listed are not touched. */
export async function PUT(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = galleryOrderInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please send a list of picture ids, each once." }, { status: 400 });
  await connectDb();
  const { ids } = parsed.data;
  if ((await GalleryImage.countDocuments({ _id: { $in: ids } })) !== ids.length) return Response.json({ error: "Some pictures no longer exist. Reload the page." }, { status: 400 });
  await GalleryImage.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
  invalidateGallery();
  return Response.json({ ok: true });
}
