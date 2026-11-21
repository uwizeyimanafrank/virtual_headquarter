import { readJsonLimited } from "@/lib/body";
import { connectDb } from "@/lib/db";
import { hireRequestInput } from "@/lib/validation";
import { ipHash, isAllowedOrigin } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { HireRequest } from "@/models/HireRequest";

const OK = { ok: true, message: "Request received. Thank you. I will reply personally." };
const NO_STORE = { "Cache-Control": "no-store" };

/** Public hire request. Validates, traps bots, rate-limits (3 per hour per visitor), saves plain text. Nothing is emailed. */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers)) return Response.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });

  const body = await readJsonLimited(request, 16 * 1024);
  if (!body.ok) {
    const error = body.status === 413 ? "That request is too large." : "Please check your details and try again.";
    return Response.json({ error }, { status: body.status, headers: NO_STORE });
  }

  const parsed = hireRequestInput.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Please check your details and try again." }, { status: 400, headers: NO_STORE });
  const { website, ...data } = parsed.data;

  // Honeypot: bots fill the hidden field. Pretend success, save nothing, and do not count it against anyone.
  if (website && website.trim() !== "") return Response.json(OK, { headers: NO_STORE });

  try {
    const hash = ipHash(request.headers);
    const limit = await rateLimit(`hire:${hash}`, 3, 3600);
    if (!limit.ok) {
      return Response.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSec) } });
    }
    await connectDb();
    await HireRequest.create({ ...data, ipHash: hash });
    return Response.json(OK, { headers: NO_STORE });
  } catch (err) {
    console.error("hire route failed:", err instanceof Error ? err.message : "unknown error"); // real reason stays on the server
    return Response.json({ error: "Something went wrong. Please try again later." }, { status: 500, headers: NO_STORE });
  }
}
