import { z } from "zod";
import { isAllowedPictureUrl, type ImageSlotDef } from "@/lib/image-slots";

const shape = z.object({
  url: z.string().refine(isAllowedPictureUrl, "Use a picture stored in your Cloudinary (upload one or pick one already on the site)."),
  alt: z.string().trim().max(200, "The picture description is too long (200 characters at most).").default(""),
  credit: z.string().trim().max(200, "The credit is too long (200 characters at most).").default(""),
  license: z.string().trim().max(200, "The license note is too long (200 characters at most).").default(""),
  kind: z.enum(["upload", "library"]).default("upload"),
  focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).default({ x: 50, y: 50 }),
});

export type SlotUpdate = z.infer<typeof shape>;

/** Checks what the Office sends when the owner replaces a slot's picture. */
export function parseSlotUpdate(def: ImageSlotDef, input: unknown): { ok: true; data: SlotUpdate } | { ok: false; error: string } {
  const r = shape.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Invalid request." };
  if (!def.decorative && !r.data.alt) {
    return { ok: false, error: "Describe this picture in a few words (alt text), so people who use a screen reader know what it shows." };
  }
  return { ok: true, data: r.data };
}
