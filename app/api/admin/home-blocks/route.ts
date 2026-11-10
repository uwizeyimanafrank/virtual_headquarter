import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { audit } from "@/lib/audit";
import { BLOCK_BY_KEY, resolveBlocks, validateBlocksInput } from "@/lib/home-blocks";
import { invalidateHome } from "@/lib/home";
import { getSettings } from "@/lib/settings";
import { Settings } from "@/models/Settings";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** The layout with everything the Office editor needs: order, switches, current text, and each block's description and fields. */
async function view() {
  const s = await getSettings();
  return resolveBlocks(s.homeBlocks).map((b) => {
    const d = BLOCK_BY_KEY.get(b.key)!;
    return { ...b, label: d.label, description: d.description, required: !!d.required, fields: d.fields };
  });
}

export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  return json({ blocks: await view() });
}

/** Save the layout. The position in the list is the order. */
export async function PUT(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const body = await readJsonLimited(request, 60_000);
  if (!body.ok) return json({ error: "Invalid request." }, body.status);
  const parsed = validateBlocksInput((body.data as { blocks?: unknown } | null)?.blocks);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  await connectDb();
  await getSettings();
  await Settings.updateOne({ key: "main" }, { $set: { homeBlocks: parsed.blocks } });
  await audit("settings_change", true, request.headers, "home layout");
  invalidateHome();
  return json({ blocks: await view() });
}

/** Back to the built-in layout and wording. */
export async function DELETE(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  await getSettings();
  await Settings.updateOne({ key: "main" }, { $set: { homeBlocks: [] } });
  await audit("settings_change", true, request.headers, "home layout reset");
  invalidateHome();
  return json({ blocks: await view() });
}
