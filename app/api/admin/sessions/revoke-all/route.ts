import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { revokeAll } from "@/lib/sessions";

/** "Sign out everywhere". Keeps only the session you are using right now. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const n = await revokeAll(auth.admin._id, auth.session._id);
  await audit("sessions_revoke_all", true, request.headers, `${n} ended`);
  return Response.json({ ok: true, ended: n });
}
