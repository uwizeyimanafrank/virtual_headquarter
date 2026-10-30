import { z } from "zod";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { ipHash } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { promoteSession, setSessionCookie } from "@/lib/sessions";
import { verifySecondFactor } from "@/lib/totp";

const body = z.object({ code: z.string().min(6).max(20) });

/** Step 2 of login: authenticator code or one-time recovery code. */
export async function POST(request: Request) {
  const auth = await adminApi(request, { stage: "pending" });
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(`2fa:${ipHash(request.headers)}`, 10, 600);
  if (!limit.ok) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  const method = parsed.success ? await verifySecondFactor(auth.admin._id, parsed.data.code) : null;
  if (!method) {
    await audit("login_2fa_fail", false, request.headers);
    return Response.json({ error: "Invalid code." }, { status: 401 });
  }
  const token = await promoteSession(auth.session._id, request.headers); // brand-new token after 2FA
  await setSessionCookie(token);
  await audit("login_2fa", true, request.headers, method);
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
