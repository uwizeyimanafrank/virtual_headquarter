import { z } from "zod";
import { adminApi } from "@/lib/auth-guard";
import { getChecklist, setStepState, setTourSeen, STEP_KEYS } from "@/lib/onboarding";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("step"), step: z.enum(STEP_KEYS), state: z.enum(["done", "skipped", "clear"]) }),
  z.object({ action: z.literal("tour"), seen: z.boolean() }),
]);

export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  return Response.json(await getChecklist(), { headers: { "Cache-Control": "no-store" } });
}

/** Mark a step done/skipped (or undo), or remember that the tour was seen. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (parsed.data.action === "step") await setStepState(parsed.data.step, parsed.data.state);
  else await setTourSeen(parsed.data.seen);
  return Response.json(await getChecklist(), { headers: { "Cache-Control": "no-store" } });
}
