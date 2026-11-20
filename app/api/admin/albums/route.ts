import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { toAdminAlbum } from "@/lib/admin-gallery";
import { invalidateHome } from "@/lib/home";
import { albumInput } from "@/lib/validation";
import { Album } from "@/models/Album";

/** Create an album. It goes to the end of the albums. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = albumInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "An album needs a title (up to 80 characters)." }, { status: 400 });
  await connectDb();
  const last = await Album.findOne({}).sort({ order: -1 }).select("order").lean();
  const created = await Album.create({ ...parsed.data, order: (last?.order ?? -1) + 1 });
  invalidateHome();
  return Response.json({ album: toAdminAlbum(created.toObject()) }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
