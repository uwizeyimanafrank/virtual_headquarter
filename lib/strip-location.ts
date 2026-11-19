// Removes location (GPS) and other hidden metadata from a picture BEFORE it leaves the browser (P13-T04).
// Pure byte work, no DOM, so it is fully testable. JPEG, PNG and WebP are cleaned here.
// A phone photo can carry the exact place it was taken (EXIF GPS), the camera, the time, and a hidden thumbnail.
// We drop every metadata block instead of hunting for GPS tags: unknown blocks cannot leak what we do not keep.
// The one thing we keep is the ORIENTATION, rewritten as a tiny EXIF block with nothing else in it, otherwise upright phone photos turn sideways.

import { sniffImage } from "@/lib/image-sniff";

export class StripError extends Error {
  constructor(message: string) { super(message); this.name = "StripError"; }
}

const bad = () => new StripError("That picture could not be read safely, so it was not uploaded. Try saving it again as a JPG.");
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const startsWith = (b: Uint8Array, at: number, s: string) => ascii(s).every((c, i) => b[at + i] === c);

/** Join byte pieces into one array. */
function join(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

/** Read the Orientation tag (1 to 8) from a TIFF block, or 1 when it is missing or the block is odd. Never throws. */
function readOrientation(tiff: Uint8Array): number {
  if (tiff.length < 8) return 1;
  const little = startsWith(tiff, 0, "II");
  if (!little && !startsWith(tiff, 0, "MM")) return 1;
  const u16 = (at: number) => (at + 2 <= tiff.length ? (little ? tiff[at] | (tiff[at + 1] << 8) : (tiff[at] << 8) | tiff[at + 1]) : -1);
  const u32 = (at: number) => (at + 4 <= tiff.length ? (little ? (tiff[at] | (tiff[at + 1] << 8) | (tiff[at + 2] << 16) | (tiff[at + 3] << 24)) >>> 0 : ((tiff[at] << 24) | (tiff[at + 1] << 16) | (tiff[at + 2] << 8) | tiff[at + 3]) >>> 0) : -1);
  if (u16(2) !== 42) return 1;
  const ifd = u32(4);
  const count = ifd < 0 ? -1 : u16(ifd);
  if (count < 0 || count > 500) return 1;
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (u16(e) === 0x0112 && u16(e + 2) === 3) {
      const v = u16(e + 8);
      return v >= 1 && v <= 8 ? v : 1;
    }
  }
  return 1;
}

/** A TIFF block holding ONLY the orientation (26 bytes). Nothing else can be in it. */
function orientationTiff(orientation: number): Uint8Array {
  return Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0]);
}

// ---------------------------------------------------------------- JPEG

const STANDALONE = (m: number) => m === 0x01 || (m >= 0xd0 && m <= 0xd9);

function stripJpeg(b: Uint8Array): Uint8Array {
  const kept: Uint8Array[] = [];
  let orientation = 1;
  let i = 2; // after the start marker
  let end = -1;
  while (i < b.length) {
    if (b[i] !== 0xff) throw bad();
    const m = b[i + 1];
    if (m === undefined) throw bad();
    if (m === 0xff) { i++; continue; } // padding byte
    if (STANDALONE(m) && m !== 0xd9) { kept.push(b.subarray(i, i + 2)); i += 2; continue; }
    if (m === 0xd9) { end = i + 2; kept.push(b.subarray(i, end)); break; }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (!(len >= 2) || i + 2 + len > b.length) throw bad();
    const seg = b.subarray(i, i + 2 + len);
    const payload = b.subarray(i + 4, i + 2 + len);
    if (m === 0xe1 && startsWith(payload, 0, "Exif\0\0")) orientation = readOrientation(payload.subarray(6));
    // Keep: APP0 (JFIF), APP2 colour profile (not the multi-picture index), APP14 (Adobe colours), and every non-APPn marker.
    const isApp = m >= 0xe0 && m <= 0xef;
    const keep = !isApp ? m !== 0xfe : m === 0xe0 || m === 0xee || (m === 0xe2 && !startsWith(payload, 0, "MPF\0"));
    if (keep) kept.push(seg);
    i += 2 + len;
    if (m === 0xda) {
      // Start of scan: the picture data follows. Copy it up to the real end-of-image marker and cut anything after it
      // (extra embedded pictures and videos some phones append can hold their own metadata).
      let j = i;
      while (j < b.length - 1 && !(b[j] === 0xff && b[j + 1] === 0xd9)) j++;
      if (j >= b.length - 1) throw bad();
      kept.push(b.subarray(i, j + 2));
      end = j + 2;
      break;
    }
  }
  if (end < 0) throw bad();
  const head = kept.length > 0 && kept[0][1] === 0xe0 ? 1 : 0; // put the orientation block after JFIF, if there is one
  if (orientation > 1) {
    const tiff = orientationTiff(orientation);
    const seg = join([Uint8Array.from([0xff, 0xe1, 0, 2 + 6 + tiff.length]), Uint8Array.from(ascii("Exif\0\0")), tiff]);
    kept.splice(head, 0, seg);
  }
  return join([b.subarray(0, 2), ...kept]);
}

// ---------------------------------------------------------------- PNG

const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]); // text blocks (XMP lives in iTXt), EXIF, timestamp

function stripPng(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i < b.length) {
    if (i + 12 > b.length) throw bad();
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    const total = 12 + len;
    if (i + total > b.length) throw bad();
    if (!PNG_DROP.has(type)) parts.push(b.subarray(i, i + total));
    i += total;
    if (type === "IEND") break; // anything after the end is not part of the picture
  }
  return join(parts);
}

// ---------------------------------------------------------------- WebP

function stripWebp(b: Uint8Array): Uint8Array {
  if (b.length < 20) throw bad();
  const chunks: { id: string; data: Uint8Array }[] = [];
  let orientation = 1;
  let i = 12;
  while (i < b.length) {
    if (i + 8 > b.length) throw bad();
    const id = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
    const len = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    if (i + 8 + len > b.length) throw bad();
    const data = b.subarray(i + 8, i + 8 + len);
    if (id === "EXIF") orientation = readOrientation(startsWith(data, 0, "Exif\0\0") ? data.subarray(6) : data);
    if (id !== "EXIF" && id !== "XMP ") chunks.push({ id, data });
    i += 8 + len + (len % 2);
  }
  const vp8x = chunks.find((c) => c.id === "VP8X");
  if (vp8x) {
    const flags = Uint8Array.from(vp8x.data);
    flags[0] &= ~(0x08 | 0x04); // no EXIF, no XMP
    vp8x.data = flags;
    if (orientation > 1) { flags[0] |= 0x08; chunks.push({ id: "EXIF", data: orientationTiff(orientation) }); }
  }
  const body = chunks.flatMap((c) => {
    const head = Uint8Array.from([...ascii(c.id), c.data.length & 255, (c.data.length >> 8) & 255, (c.data.length >> 16) & 255, (c.data.length >>> 24) & 255]);
    return c.data.length % 2 ? [head, c.data, Uint8Array.of(0)] : [head, c.data];
  });
  const size = 4 + body.reduce((n, p) => n + p.length, 0);
  return join([Uint8Array.from([...ascii("RIFF"), size & 255, (size >> 8) & 255, (size >> 16) & 255, (size >>> 24) & 255, ...ascii("WEBP")]), ...body]);
}

/**
 * Cleaned bytes for a picture. `cleaned` says whether this kind of file is handled here:
 * JPEG, PNG and WebP are; GIF and AVIF come back unchanged with cleaned: false so the caller can refuse them where location must never leak.
 * A file that is not a picture, or is damaged, throws StripError.
 */
export function stripLocation(bytes: Uint8Array): { kind: ReturnType<typeof sniffImage>; bytes: Uint8Array; cleaned: boolean } {
  const kind = sniffImage(bytes);
  if (!kind) throw new StripError("That file is not a picture we accept.");
  if (kind === "jpg") return { kind, bytes: stripJpeg(bytes), cleaned: true };
  if (kind === "png") return { kind, bytes: stripPng(bytes), cleaned: true };
  if (kind === "webp") return { kind, bytes: stripWebp(bytes), cleaned: true };
  return { kind, bytes, cleaned: false };
}
