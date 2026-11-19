import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { toAdminDispatch } from "@/lib/admin-dispatches";
import { invalidateHome } from "@/lib/home";
import { dispatchPatch } from "@/lib/validation";
import { Dispatch } from "@/models/Dispatch";

const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);
// Editing any of these means the owner is writing their own words, so a sample stops being a sample.
const CONTENT_KEYS = ["title", "text", "kind", "imageUrl", "video", "date"] as const;

export async function GET(request: Request, ctx: RouteContext<"/api/admin/dispatches/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const d = await Dispatch.findById(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ item: toAdminDispatch(d) }, { headers: { "Cache-Control": "no-store" } });
}

/** Partial update: only the fields you send change. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/dispatches/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const parsed = dispatchPatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  const $set: Record<string, unknown> = { ...parsed.data };
  if (Object.keys($set).length === 0) return Response.json({ error: "Nothing to change." }, { status: 400 });
  if (CONTENT_KEYS.some((k) => k in parsed.data)) $set.isSample = false;

  await connectDb();
  // A schedule must stay in order after a partial update: check the merged result, not only what was sent.
  const current = await Dispatch.findById(id).lean();
  if (!current) return Response.json({ error: "Not found." }, { status: 404 });
  const start = "publishAt" in $set ? ($set.publishAt as string | null) : current.publishAt;
  const end = "expireAt" in $set ? ($set.expireAt as string | null) : current.expireAt;
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    return Response.json({ error: "Please check the fields.", issues: [{ path: "expireAt", message: "expireAt must be after publishAt" }] }, { status: 400 });
  }

  const d = await Dispatch.findByIdAndUpdate(id, { $set }, { returnDocument: "after", runValidators: true }).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  return Response.json({ item: toAdminDispatch(d) }, { headers: { "Cache-Control": "no-store" } });
}

/** Delete needs a fresh authenticator code and is written to the audit log. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/dispatches/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const d = await Dispatch.findByIdAndDelete(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404 });
  invalidateHome();
  await audit("delete", true, request.headers, `dispatch ${d.kind}`);
  return Response.json({ ok: true });
}
