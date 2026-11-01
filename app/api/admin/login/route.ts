import { z } from "zod";
import { readJsonLimited } from "@/lib/body";
import { connectDb } from "@/lib/db";
import { getBootstrapHash, hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ipHash, isAllowedOrigin } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { createSession, setSessionCookie } from "@/lib/sessions";
import { AdminUser } from "@/models/AdminUser";

const body = z.object({ email: z.email().max(160), password: z.string().min(1).max(200) });
const FAIL = () => Response.json({ error: "Invalid credentials." }, { status: 401, headers: { "Cache-Control": "no-store" } });

/** Step 1 of login: email + password. Always the same answer when anything is wrong. */
export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isAllowedOrigin(request.headers)) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  try {
    const hash = ipHash(request.headers);
    // Too many tries from one place, or too many overall (spread-out guessing): slow down.
    const [perIp, overall] = await Promise.all([
      rateLimit(`login:ip:${hash}`, 10, 900),
      rateLimit("login:all", 30, 900),
    ]);
    if (!perIp.ok || !overall.ok) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(perIp.retryAfterSec, overall.retryAfterSec)) } });
    }

    const raw = await readJsonLimited(request, 5_000);
    if (!raw.ok) return raw.status === 413 ? Response.json({ error: "Too large." }, { status: 413 }) : FAIL();
    const parsed = body.safeParse(raw.data);
    if (!parsed.success) return FAIL();
    const email = parsed.data.email.trim().toLowerCase();

    await connectDb();
    const admin = await AdminUser.findOne({}).lean();
    const bootstrapHash = getBootstrapHash();
    const storedHash = admin?.passwordHash ?? bootstrapHash;

    // Always run the password check (even for unknown email) so timing doesn't reveal anything.
    const passwordOk = await verifyPassword(parsed.data.password, storedHash);
    const emailOk = admin ? admin.email === email : Boolean(bootstrapHash);
    const locked = admin?.lockedUntil ? admin.lockedUntil.getTime() > Date.now() : false;

    if (!passwordOk || !emailOk || locked) {
      await audit("login_fail", false, request.headers, locked ? "locked" : "");
      return FAIL();
    }

    // First ever login: create the owner account from the bootstrap hash.
    let adminId: unknown = admin?._id;
    if (!admin) {
      const created = await AdminUser.create({ email, passwordHash: bootstrapHash ?? (await hashPassword(parsed.data.password)) });
      adminId = created._id;
    }
    const totpEnabled = admin?.totpEnabled ?? false;
    const stage = totpEnabled ? "pending" : "enroll";
    const token = await createSession(String(adminId), stage, request.headers);
    await setSessionCookie(token);
    await audit("login_password", true, request.headers, stage);
    return Response.json({ ok: true, step: totpEnabled ? "2fa" : "enroll" }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("login failed:", err instanceof Error ? err.message : "unknown error");
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
