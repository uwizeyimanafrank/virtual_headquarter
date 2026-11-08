export type ImageKind = "jpg" | "png" | "gif" | "webp" | "avif";

/** What kind of picture a file really is, from its first bytes (not from its name or what the server claims). */
export function sniffImage(b: Uint8Array): ImageKind | null {
  const at = (i: number, s: string) => s.split("").every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && b[0] === 0x89 && at(1, "PNG") && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 6 && (at(0, "GIF87a") || at(0, "GIF89a"))) return "gif";
  if (b.length >= 12 && at(0, "RIFF") && at(8, "WEBP")) return "webp";
  if (b.length >= 12 && at(4, "ftyp") && (at(8, "avif") || at(8, "avis"))) return "avif";
  return null; // includes SVG and anything else: those are refused
}

export const MIME: Record<ImageKind, string> = { jpg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", avif: "image/avif" };
