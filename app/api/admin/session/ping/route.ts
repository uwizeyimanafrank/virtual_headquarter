import { adminApi } from "@/lib/auth-guard";
import { rotateIfDue, setSessionCookie } from "@/lib/sessions";

/** Keep-alive from an active Office tab. Also swaps the cookie token every 15 minutes. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const fresh = await rotateIfDue(auth.session);
  if (fresh) await setSessionCookie(fresh);
  return Response.json({ ok: true, rotated: Boolean(fresh) }, { headers: { "Cache-Control": "no-store" } });
}
