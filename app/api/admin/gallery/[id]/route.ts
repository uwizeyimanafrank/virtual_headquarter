import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { toAdminGalleryImage } from "@/lib/admin-gallery";
import { invalidateHome } from "@/lib/home";
import { galleryImagePatch } from "@/lib/validation";
import { Album } from "@/models/Album";
import { GalleryImage } from "@/models/GalleryImage";

const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

/** Partial update: only the fields you send change. Alt text can be changed but never emptied. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/gallery/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const parsed = galleryImagePatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  const { takenDate, ...rest } = parsed.data;
  const $set: Record<string, unknown> = { ...rest };
  if (takenDate !== undefined) $set.takenDate = takenDate ? new Date(takenDate) : null;
  if (Object.keys($set).length === 0) return Response.json({ error: "Nothing to change." }, { status: 400 });
  await connectDb();
  if (parsed.data.album && !(await Album.exists({ _id: parsed.data.album }))) return Response.json({ error: "That album does not exist." }, { status: 400 });
  const d = await GalleryImage.findByIdAndUpdate(id, { $set }, { returnDocument: "after", runValidators: true }).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  return Response.json({ image: toAdminGalleryImage(d) }, { headers: { "Cache-Control": "no-store" } });
}

/** Delete needs a fresh authenticator code and is written to the audit log. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/gallery/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const d = await GalleryImage.findByIdAndDelete(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  await audit("delete", true, request.headers, "gallery picture");
  return Response.json({ ok: true });
}
