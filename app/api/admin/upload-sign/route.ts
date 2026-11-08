import { z } from "zod";
import { adminApi } from "@/lib/auth-guard";
import { getUploadSignature } from "@/lib/cloudinary";
import { ITEM_TYPES } from "@/models/MuseumItem";

const body = z.object({ folder: z.enum([...ITEM_TYPES, "profile", "slot"]) });

/**
 * Gives the browser a one-time signature to upload an image straight to Cloudinary.
 * The API secret never leaves the server. Only image formats are allowed (signed, so they can't be changed).
 */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    return Response.json(getUploadSignature(`vhq/${parsed.data.folder}`), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Usually missing Cloudinary settings. The message names the variable, never a value.
    return Response.json({ error: err instanceof Error ? err.message : "Uploads are not set up." }, { status: 500 });
  }
}
