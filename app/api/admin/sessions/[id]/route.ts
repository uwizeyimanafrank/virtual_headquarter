import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { revokeSession } from "@/lib/sessions";
import { Session } from "@/models/Session";

/** Signs one device out. Only sessions that belong to this owner can be touched. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/sessions/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  await connectDb();
  const s = await Session.findOne({ _id: id, adminId: auth.admin._id }).lean();
  if (!s) return Response.json({ error: "Not found." }, { status: 404 });
  await revokeSession(s._id);
  await audit("session_revoke", true, request.headers, s.deviceLabel);
  return Response.json({ ok: true });
}
