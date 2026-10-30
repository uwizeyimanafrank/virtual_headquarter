import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { museumItemPatch } from "@/lib/validation";
import { MuseumItem } from "@/models/MuseumItem";
import { toAdminItem } from "@/lib/admin-items";
import { invalidateHome } from "@/lib/home";
import { invalidateMuseum } from "@/lib/museum";

const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);
// Editing any of these means the owner is now writing their own content, so a sample stops being a sample.
const CONTENT_KEYS = ["type", "title", "description", "mediaUrl", "parallaxSpeed", "date", "metadata"] as const;

export async function GET(request: Request, ctx: RouteContext<"/api/admin/items/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const d = await MuseumItem.findById(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ item: toAdminItem(d) }, { headers: { "Cache-Control": "no-store" } });
}

/** Partial update: only the fields you send change. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/items/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const parsed = museumItemPatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }

  const { metadata, ...rest } = parsed.data;
  const $set: Record<string, unknown> = { ...rest };
  if (metadata) for (const [k, v] of Object.entries(metadata)) if (v !== undefined) $set[`metadata.${k}`] = v;
  if (Object.keys($set).length === 0) return Response.json({ error: "Nothing to change." }, { status: 400 });
  if (CONTENT_KEYS.some((k) => k in parsed.data)) $set.isSample = false;

  await connectDb();
  const d = await MuseumItem.findByIdAndUpdate(id, { $set }, { returnDocument: "after", runValidators: true }).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  invalidateMuseum();
  return Response.json({ item: toAdminItem(d) }, { headers: { "Cache-Control": "no-store" } });
}

/** Delete needs a fresh authenticator code and is written to the audit log. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/items/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const d = await MuseumItem.findByIdAndDelete(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  invalidateMuseum();
  await audit("delete", true, request.headers, `item ${d.type}`);
  return Response.json({ ok: true });
}
