import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { audit } from "@/lib/audit";
import { slotDef } from "@/lib/image-slots";
import { parseSlotUpdate } from "@/lib/slot-input";
import { revalidateSlots } from "@/lib/slots";
import { ImageSlot } from "@/models/ImageSlot";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Replace the picture of one slot. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/slots/[key]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { key } = await ctx.params;
  const def = slotDef(key);
  if (!def) return json({ error: "Not found." }, 404);
  const body = await readJsonLimited(request, 10_000);
  if (!body.ok) return json({ error: "Invalid request." }, body.status);
  const parsed = parseSlotUpdate(def, body.data);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  await connectDb();
  const d = parsed.data;
  await ImageSlot.findOneAndUpdate(
    { key },
    { $set: { key, url: d.url, alt: d.alt, focal: d.focal, credit: d.credit, license: d.license, kind: d.kind, publicId: "", sourceUrl: "" } },
    { upsert: true },
  );
  await audit("settings_change", true, request.headers, `image ${key}`);
  revalidateSlots();
  return json({ ok: true });
}

/** Put the default picture back. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/slots/[key]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { key } = await ctx.params;
  if (!slotDef(key)) return json({ error: "Not found." }, 404);
  await connectDb();
  await ImageSlot.deleteOne({ key });
  await audit("settings_change", true, request.headers, `image ${key} reset`);
  revalidateSlots();
  return json({ ok: true });
}
