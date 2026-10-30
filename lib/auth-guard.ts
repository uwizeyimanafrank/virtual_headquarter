import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { connectDb } from "@/lib/db";
import { adminBase } from "@/lib/auth";
import { isAllowedOrigin } from "@/lib/request";
import { currentToken, findSession, type Stage } from "@/lib/sessions";
import { AdminUser } from "@/models/AdminUser";

type FoundSession = NonNullable<Awaited<ReturnType<typeof findSession>>>;
type FoundAdmin = NonNullable<Awaited<ReturnType<typeof loadAdmin>>>;

async function loadAdmin(id: unknown) {
  await connectDb();
  return AdminUser.findById(id).lean();
}

/** One lookup per request even if the layout and the page both call requireAdmin(). */
const currentAdmin = cache(async () => {
  const session = await findSession(await currentToken());
  if (!session || session.stage !== "full") return null;
  const admin = await loadAdmin(session.adminId);
  return admin ? { admin, session } : null;
});

/**
 * For Office PAGES. Redirects to the login page when there is no fully signed-in session.
 * RULE: every Office page calls `await requireAdmin()` as its FIRST line. Layouts and pages render
 * side by side, so a layout check alone does not stop a page from being built for a stranger.
 */
export async function requireAdmin(): Promise<{ admin: FoundAdmin; session: FoundSession }> {
  // Always decide per request. Without this, Next.js could bake the answer into the build
  // (for example a 404 when ADMIN_ROUTE_SLUG was not set while building).
  await connection();
  const base = adminBase(); // 404 if the Office is not configured
  const found = await currentAdmin();
  if (!found) redirect(`${base}/login`);
  return found;
}

const deny = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * For admin API ROUTES. Usage:
 *   const auth = await adminApi(request);
 *   if (!auth.ok) return auth.response;
 * `stage` is "full" for normal use, or "pending"/"enroll" for the login steps.
 */
export async function adminApi(request: Request, opts: { stage?: Stage } = {}) {
  const need = opts.stage ?? "full";
  // CSRF defence on top of SameSite=Strict: changes must come from our own site.
  if (!["GET", "HEAD"].includes(request.method)) {
    if (!request.headers.get("origin") || !isAllowedOrigin(request.headers)) {
      return { ok: false as const, response: deny(403, "Not allowed.") };
    }
  }
  const session = await findSession(await currentToken());
  if (!session || session.stage !== need) return { ok: false as const, response: deny(401, "Not signed in.") };
  const admin = await loadAdmin(session.adminId);
  if (!admin) return { ok: false as const, response: deny(401, "Not signed in.") };
  return { ok: true as const, admin, session };
}

/** Step-up check: returns a 401 Response unless 2FA was proven within `maxAgeSec`. */
export function requireFreshAuth(session: { twoFactorAt?: Date | null }, maxAgeSec = 300): Response | null {
  const at = session.twoFactorAt?.getTime() ?? 0;
  if (Date.now() - at > maxAgeSec * 1000) {
    return Response.json({ error: "Please confirm with your authenticator code.", code: "STEP_UP_REQUIRED" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}
