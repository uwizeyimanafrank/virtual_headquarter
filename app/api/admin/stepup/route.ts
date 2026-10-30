import { z } from "zod";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { ipHash } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { markTwoFactor } from "@/lib/sessions";
import { verifySecondFactor } from "@/lib/totp";

const body = z.object({ code: z.string().min(6).max(20) });

/** Re-proves 2FA for the current session so sensitive actions are allowed for the next 5 minutes. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;

  const limit = await rateLimit(`stepup:${ipHash(request.headers)}`, 10, 600);
  if (!limit.ok) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  const method = parsed.success ? await verifySecondFactor(auth.admin._id, parsed.data.code) : null;
  if (!method) {
    await audit("stepup_fail", false, request.headers);
    return Response.json({ error: "Invalid code." }, { status: 401 });
  }
  await markTwoFactor(auth.session._id);
  await audit("stepup", true, request.headers, method);
  return Response.json({ ok: true });
}
