import { readJsonLimited } from "@/lib/body";
import { connectDb } from "@/lib/db";
import { contactInput } from "@/lib/validation";
import { ipHash, isAllowedOrigin } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { Message } from "@/models/Message";

const OK = { ok: true, message: "Message received. Thank you." };
const NO_STORE = { "Cache-Control": "no-store" };

/** Public contact form. Validates, rate-limits, and saves plain text only. */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers)) {
    return Response.json({ error: "Not allowed." }, { status: 403, headers: NO_STORE });
  }

  const body = await readJsonLimited(request);
  if (!body.ok) {
    const error = body.status === 413 ? "That message is too large." : "Please check your details and try again.";
    return Response.json({ error }, { status: body.status, headers: NO_STORE });
  }
  const raw = body.data;

  const parsed = contactInput.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Please check your details and try again." }, { status: 400, headers: NO_STORE });
  }
  const { name, email, message, website } = parsed.data;

  // Honeypot: bots fill the hidden field. Pretend success, save nothing.
  if (website && website.trim() !== "") return Response.json(OK, { headers: NO_STORE });

  try {
    const hash = ipHash(request.headers);
    const limit = await rateLimit(`connect:${hash}`, 5, 3600);
    if (!limit.ok) {
      return Response.json(
        { error: "Too many messages. Please try again later." },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSec) } },
      );
    }

    await connectDb();
    await Message.create({ name, email, body: message, ipHash: hash });
    return Response.json(OK, { headers: NO_STORE });
  } catch (err) {
    // Log the real reason on the server only. The visitor gets a generic answer.
    console.error("connect route failed:", err instanceof Error ? err.message : "unknown error");
    return Response.json({ error: "Something went wrong. Please try again later." }, { status: 500, headers: NO_STORE });
  }
}
