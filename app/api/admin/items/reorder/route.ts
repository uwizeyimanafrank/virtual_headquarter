import { z } from "zod";
import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { invalidateHome } from "@/lib/home";
import { MuseumItem } from "@/models/MuseumItem";

const body = z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(200) });

/** Saves a new order: the first id gets order 0, the next 1, and so on. Send the ids of ONE type. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.ids).size !== parsed.data.ids.length) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  await connectDb();
  await MuseumItem.bulkWrite(parsed.data.ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
  invalidateHome();
  return Response.json({ ok: true });
}
