import { z } from "zod";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { ipHash } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { testCloudinary, testMongo } from "@/lib/doctor";

const body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mongodb"), uri: z.string().min(1).max(2000) }),
  z.object({
    kind: z.literal("cloudinary"),
    cloudName: z.string().regex(/^[a-z0-9_-]{2,60}$/i),
    apiKey: z.string().regex(/^\d{6,20}$/),
    apiSecret: z.string().min(8).max(100),
  }),
]);

/**
 * "Test without saving": checks pasted values with a temporary connection.
 * Needs a fresh 2FA (this makes the server connect to an address you provide), is rate-limited,
 * and returns only a coarse reason. The pasted values are never stored or logged.
 */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;

  const limit = await rateLimit(`doctor:${ipHash(request.headers)}`, 10, 600);
  if (!limit.ok) return Response.json({ error: "Too many tests. Try again in a few minutes." }, { status: 429 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, reason: "format", message: "Those values do not look right. Check what you pasted." }, { headers: { "Cache-Control": "no-store" } });

  const r = parsed.data.kind === "mongodb" ? await testMongo(parsed.data.uri) : await testCloudinary(parsed.data);
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}
