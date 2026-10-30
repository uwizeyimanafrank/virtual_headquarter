import { isAllowedOrigin } from "@/lib/request";
import { audit } from "@/lib/audit";
import { clearSessionCookie, currentToken, findSession, revokeSession } from "@/lib/sessions";

/** Ends the current session (any stage) and clears the cookie. */
export async function POST(request: Request) {
  if (!request.headers.get("origin") || !isAllowedOrigin(request.headers)) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }
  const s = await findSession(await currentToken());
  if (s) {
    await revokeSession(s._id);
    await audit("logout", true, request.headers);
  }
  await clearSessionCookie();
  return Response.json({ ok: true });
}
