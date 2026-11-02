import { z } from "zod";
import { adminApi } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { hasEnv } from "@/lib/env";
import { askTwin } from "@/lib/gemini";
import { ipHash } from "@/lib/request";
import { rateLimit } from "@/lib/rateLimit";
import { collectTwinContext } from "@/lib/twin-context";

const body = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "model"]), text: z.string().max(2000) })).max(40).default([]),
});
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Chat with the AI Twin. Only the signed-in owner can call it. The snapshot of site numbers is added
 * on the server (the browser never sees or sends it), the conversation is trimmed to the last 10 turns,
 * and the answer comes back as plain text.
 */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;

  if (!hasEnv("GEMINI_API_KEY")) {
    return Response.json({ error: "The AI Twin is not set up yet. Add GEMINI_API_KEY to your settings (see Setup, Config Doctor)." }, { status: 503, headers: NO_STORE });
  }
  const limit = await rateLimit(`twin:${ipHash(request.headers)}`, 20, 600);
  if (!limit.ok) return Response.json({ error: "Easy there: too many questions in a short time. Try again in a few minutes." }, { status: 429, headers: NO_STORE });

  const raw = await readJsonLimited(request, 60_000);
  if (!raw.ok) return Response.json({ error: "That message is too large or not valid." }, { status: raw.status, headers: NO_STORE });
  const parsed = body.safeParse(raw.data);
  if (!parsed.success) return Response.json({ error: "Please write a message (up to 2000 characters)." }, { status: 400, headers: NO_STORE });

  try {
    const context = await collectTwinContext();
    const reply = await askTwin({ history: parsed.data.history, message: parsed.data.message, context });
    return Response.json({ reply }, { headers: NO_STORE });
  } catch (err) {
    // Log only what kind of failure it was. Never the key, the prompt or the user's text.
    console.error("ai twin failed:", err instanceof Error ? err.name : "unknown error");
    return Response.json({ error: "The AI Twin could not answer right now. Please try again in a moment." }, { status: 502, headers: NO_STORE });
  }
}
