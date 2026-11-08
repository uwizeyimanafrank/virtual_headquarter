import { adminApi } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { audit } from "@/lib/audit";
import { ImportError, importImage } from "@/lib/import-image";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Imports a picture from a link into OUR Cloudinary. It is not put in a slot until the owner saves the slot. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const body = await readJsonLimited(request, 3_000);
  if (!body.ok) return json({ error: "Invalid request." }, body.status);
  const link = (body.data as { link?: unknown } | null)?.link;
  if (typeof link !== "string" || link.trim().length < 8 || link.length > 1_000) return json({ error: "Paste the full link of a picture (it starts with https)." }, 400);
  try {
    const r = await importImage(link);
    await audit("settings_change", true, request.headers, `image imported from ${r.host}`);
    return json(r);
  } catch (e) {
    if (e instanceof ImportError) return json({ error: e.message }, 400);
    return json({ error: "Could not import that picture." }, 500);
  }
}
