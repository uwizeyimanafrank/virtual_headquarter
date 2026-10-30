import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { newTotpSecret, qrDataUrl } from "@/lib/totp";
import { AdminUser } from "@/models/AdminUser";

/** First-time setup: makes a new authenticator secret and QR code. It is not active until confirmed. */
export async function POST(request: Request) {
  const auth = await adminApi(request, { stage: "enroll" });
  if (!auth.ok) return auth.response;
  try {
    const { secret, uri, enc } = newTotpSecret(auth.admin.email);
    await connectDb();
    await AdminUser.updateOne({ _id: auth.admin._id }, { $set: { totpPendingEnc: enc } });
    return Response.json({ qr: await qrDataUrl(uri), secret }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Usually a missing SERVICE_CRED_KEY. The message names the variable, never a value.
    return Response.json({ error: err instanceof Error ? err.message : "Could not start setup." }, { status: 500 });
  }
}
