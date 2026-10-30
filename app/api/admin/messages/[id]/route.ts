import { z } from "zod";
import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { Message } from "@/models/Message";

const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);
const patch = z.object({ read: z.boolean().optional(), archived: z.boolean().optional() });

/** Mark read/unread or archive/unarchive. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/messages/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const parsed = patch.safeParse(await request.json().catch(() => null));
  if (!isId(id) || !parsed.success || Object.keys(parsed.data).length === 0) return Response.json({ error: "Invalid request." }, { status: 400 });
  await connectDb();
  const r = await Message.updateOne({ _id: id }, { $set: parsed.data });
  if (r.matchedCount === 0) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ ok: true });
}

/** Delete needs a fresh authenticator code and is written to the audit log. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/messages/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const r = await Message.deleteOne({ _id: id });
  if (r.deletedCount === 0) return Response.json({ error: "Not found." }, { status: 404 });
  await audit("delete", true, request.headers, "message");
  return Response.json({ ok: true });
}
