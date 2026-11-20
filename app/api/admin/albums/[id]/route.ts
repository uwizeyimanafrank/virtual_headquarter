import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { toAdminAlbum } from "@/lib/admin-gallery";
import { invalidateHome } from "@/lib/home";
import { albumPatch } from "@/lib/validation";
import { Album } from "@/models/Album";
import { GalleryImage } from "@/models/GalleryImage";

const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/albums/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const parsed = albumPatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return Response.json({ error: "Please check the fields." }, { status: 400 });
  await connectDb();
  const d = await Album.findByIdAndUpdate(id, { $set: parsed.data }, { returnDocument: "after", runValidators: true }).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  return Response.json({ album: toAdminAlbum(d) }, { headers: { "Cache-Control": "no-store" } });
}

/** Deleting an album NEVER deletes its pictures: they just move out of the album. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/albums/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const d = await Album.findByIdAndDelete(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  await GalleryImage.updateMany({ album: id }, { $set: { album: null } });
  invalidateHome();
  await audit("delete", true, request.headers, "gallery album");
  return Response.json({ ok: true });
}
