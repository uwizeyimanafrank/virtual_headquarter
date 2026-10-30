import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { clearSessionCookie, revokeAll } from "@/lib/sessions";
import { AdminUser } from "@/models/AdminUser";

const LOCK_MS = 60 * 60 * 1000;

/** Panic button: ends EVERY session (including this one) and blocks logins for one hour. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  await AdminUser.updateOne({ _id: auth.admin._id }, { $set: { lockedUntil: new Date(Date.now() + LOCK_MS) } });
  const n = await revokeAll(auth.admin._id);
  await audit("panic", true, request.headers, `${n} sessions ended`);
  await clearSessionCookie();
  return Response.json({ ok: true, ended: n, lockedMinutes: LOCK_MS / 60000 });
}
