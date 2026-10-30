import { z } from "zod";
import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { ipHash } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { promoteSession, setSessionCookie } from "@/lib/sessions";
import { checkTotp, generateRecoveryCodes, hashRecoveryCode } from "@/lib/totp";
import { AdminUser } from "@/models/AdminUser";

const body = z.object({ code: z.string().regex(/^\d{6}$/) });

/** Finishes setup: proves the authenticator works, turns 2FA on, returns recovery codes ONCE. */
export async function POST(request: Request) {
  const auth = await adminApi(request, { stage: "enroll" });
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(`2fa:${ipHash(request.headers)}`, 10, 600);
  if (!limit.ok) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  const pending = auth.admin.totpPendingEnc;
  const step = parsed.success && pending ? checkTotp(pending, parsed.data.code, 0) : null;
  if (step === null) return Response.json({ error: "Invalid code." }, { status: 401 });

  const recoveryCodes = generateRecoveryCodes();
  await connectDb();
  await AdminUser.updateOne(
    { _id: auth.admin._id },
    { $set: { totpEnabled: true, totpSecretEnc: pending, totpPendingEnc: "", lastTotpStep: step, recoveryCodeHashes: recoveryCodes.map(hashRecoveryCode) } },
  );
  const token = await promoteSession(auth.session._id, request.headers);
  await setSessionCookie(token);
  await audit("enroll_2fa", true, request.headers);
  return Response.json({ ok: true, recoveryCodes }, { headers: { "Cache-Control": "no-store" } });
}
