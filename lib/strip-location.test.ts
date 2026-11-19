import { describe, expect, it } from "vitest";
import { StripError, stripLocation } from "@/lib/strip-location";

const enc = (s: string) => Uint8Array.from(Array.from(s, (c) => c.charCodeAt(0)));
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let a = 0; for (const x of p) { o.set(x, a); a += x.length; } return o; };
const text = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join("");
const u16be = (n: number) => Uint8Array.of(n >> 8, n & 255);
const u32le = (n: number) => Uint8Array.of(n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255);
const u32be = (n: number) => Uint8Array.of(n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255);

/** A little-endian EXIF TIFF block that carries an Orientation AND a GPS block (what a phone photo has). */
function exifWithGps(orientation: number): Uint8Array {
  const gps = cat(Uint8Array.of(1, 0), Uint8Array.of(1, 0, 2, 0, 2, 0, 0, 0, 0x4e, 0, 0, 0), u32le(0)); // GPS IFD: one tag (LatitudeRef "N")
  return cat(
    enc("II"), Uint8Array.of(42, 0), u32le(8),
    Uint8Array.of(2, 0),
    Uint8Array.of(0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0), // Orientation
    Uint8Array.of(0x25, 0x88, 4, 0, 1, 0, 0, 0), u32le(8 + 2 + 24 + 4), // pointer to the GPS IFD
    u32le(0), gps,
  );
}
const seg = (marker: number, payload: Uint8Array) => cat(Uint8Array.of(0xff, marker), u16be(payload.length + 2), payload);

const IMAGE_PART = cat(seg(0xdb, Uint8Array.of(0, 1, 2, 3)), seg(0xc0, Uint8Array.of(8, 0, 1, 0, 1, 1, 1, 0x11, 0)), seg(0xda, Uint8Array.of(1, 1, 0, 0, 0x3f, 0)), enc("PIXELS"), Uint8Array.of(0xff, 0xd9));
function jpeg(orientation: number, extra: Uint8Array = new Uint8Array()): Uint8Array {
  return cat(
    Uint8Array.of(0xff, 0xd8),
    seg(0xe0, enc("JFIF\0\x01\x01\0\0\x01\0\x01\0\0")),
    seg(0xe1, cat(enc("Exif\0\0"), exifWithGps(orientation))),
    seg(0xe1, enc("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta><exif:GPSLatitude>1,2</exif:GPSLatitude></x:xmpmeta>")),
    seg(0xed, enc("Photoshop 3.0\0IPTC-CITY-Kigali")),
    seg(0xfe, enc("comment-with-place")),
    seg(0xe2, enc("MPF\0multi-picture")),
    IMAGE_PART,
    extra,
  );
}

const LEAKS = ["GPS", "xmp", "Photoshop", "IPTC", "Kigali", "comment-with-place", "MPF", "TRAILER-GPS"];
const expectNoLeaks = (b: Uint8Array) => { const t = text(b); for (const w of LEAKS) expect(t, w).not.toContain(w); };

describe("stripLocation: JPEG", () => {
  it("leaves no GPS, XMP, IPTC, comment, multi-picture block or trailing data, and keeps the picture data byte for byte", () => {
    const input = jpeg(1, enc("TRAILER-GPS"));
    for (const w of LEAKS) expect(text(input), `fixture must contain ${w}`).toContain(w); // the test only means something if the leaks are really there
    const r = stripLocation(input);
    expect(r).toMatchObject({ kind: "jpg", cleaned: true });
    expectNoLeaks(r.bytes);
    expect(text(r.bytes)).not.toContain("Exif"); // orientation 1 needs no EXIF block at all
    expect(text(r.bytes)).toContain(text(IMAGE_PART)); // quantisation table, frame header, scan and pixels are untouched
    expect(Array.from(r.bytes.subarray(0, 2))).toEqual([0xff, 0xd8]);
    expect(Array.from(r.bytes.subarray(-2))).toEqual([0xff, 0xd9]);
  });
  it("keeps the Orientation (so upright photos stay upright) in an EXIF block that holds nothing else", () => {
    const r = stripLocation(jpeg(6));
    expectNoLeaks(r.bytes);
    const t = text(r.bytes);
    const at = t.indexOf("Exif\0\0");
    expect(at).toBeGreaterThan(0);
    const tiff = r.bytes.subarray(at + 6, at + 6 + 26);
    expect(Array.from(tiff)).toEqual([0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
    expect(t.match(/Exif/g)).toHaveLength(1);
    // The cleaned file can be cleaned again with the same result (nothing left to strip).
    expect(Array.from(stripLocation(r.bytes).bytes)).toEqual(Array.from(r.bytes));
  });
  it("refuses a damaged JPEG instead of passing hidden data along", () => {
    expect(() => stripLocation(jpeg(1).subarray(0, 40))).toThrow(StripError);
    expect(() => stripLocation(cat(Uint8Array.of(0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff), enc("short")))).toThrow(StripError);
    expect(() => stripLocation(cat(Uint8Array.of(0xff, 0xd8, 0xff, 0xda, 0, 2), enc("no end marker")))).toThrow(StripError);
  });
});

describe("stripLocation: PNG", () => {
  const chunk = (type: string, data: Uint8Array) => cat(u32be(data.length), enc(type), data, u32be(0));
  const png = cat(
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk("IHDR", new Uint8Array(13)), chunk("tEXt", enc("Location\0GPS 1.2,3.4")), chunk("iTXt", enc("XML:com.adobe.xmp\0<GPSLatitude>")),
    chunk("eXIf", exifWithGps(3)), chunk("tIME", new Uint8Array(7)), chunk("IDAT", enc("PIXELS")), chunk("IEND", new Uint8Array(0)), enc("TRAILER-GPS"),
  );
  it("drops text, XMP, EXIF, time and trailing data; keeps the picture chunks", () => {
    const r = stripLocation(png);
    expect(r).toMatchObject({ kind: "png", cleaned: true });
    expectNoLeaks(r.bytes);
    const t = text(r.bytes);
    for (const keep of ["IHDR", "IDAT", "IEND", "PIXELS"]) expect(t).toContain(keep);
    for (const gone of ["tEXt", "iTXt", "eXIf", "tIME"]) expect(t).not.toContain(gone);
  });
  it("refuses a truncated PNG", () => { expect(() => stripLocation(png.subarray(0, 30))).toThrow(StripError); });
});

describe("stripLocation: WebP", () => {
  const chunk = (id: string, data: Uint8Array) => cat(enc(id), u32le(data.length), data, data.length % 2 ? Uint8Array.of(0) : new Uint8Array());
  const body = cat(enc("WEBP"), chunk("VP8X", Uint8Array.of(0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0)), chunk("VP8 ", enc("ODD")), chunk("EXIF", cat(enc("Exif\0\0"), exifWithGps(8))), chunk("XMP ", enc("<GPSLatitude>")));
  const webp = cat(enc("RIFF"), u32le(body.length), body);
  it("drops EXIF and XMP, clears their flags, fixes the size, keeps the picture and the Orientation", () => {
    const r = stripLocation(webp);
    expect(r).toMatchObject({ kind: "webp", cleaned: true });
    expectNoLeaks(r.bytes);
    const t = text(r.bytes);
    expect(t).not.toContain("XMP ");
    expect(t).toContain("ODD");
    const size = r.bytes[4] | (r.bytes[5] << 8) | (r.bytes[6] << 16) | (r.bytes[7] << 24);
    expect(size).toBe(r.bytes.length - 8);
    const x = t.indexOf("VP8X");
    expect(r.bytes[x + 8] & 0x04).toBe(0); // XMP flag off
    expect(r.bytes[x + 8] & 0x08).toBe(0x08); // EXIF flag on: only the orientation block remains
    const e = t.indexOf("EXIF");
    expect(Array.from(r.bytes.subarray(e + 8, e + 8 + 26)).slice(-8, -6)).toEqual([0, 8]);
  });
  it("refuses a truncated WebP", () => { expect(() => stripLocation(webp.subarray(0, 40))).toThrow(StripError); });
});

describe("stripLocation: other files", () => {
  it("returns GIF and AVIF unchanged and says they were not cleaned, so the caller can refuse them", () => {
    const gif = enc("GIF89a\x01\0\x01\0");
    expect(stripLocation(gif)).toMatchObject({ kind: "gif", cleaned: false, bytes: gif });
    const avif = cat(Uint8Array.of(0, 0, 0, 0x1c), enc("ftypavif"), new Uint8Array(8));
    expect(stripLocation(avif)).toMatchObject({ kind: "avif", cleaned: false });
  });
  it("refuses things that are not pictures (SVG, text, empty)", () => {
    for (const b of [enc("<svg xmlns='x'/>"), enc("hello"), new Uint8Array()]) expect(() => stripLocation(b)).toThrow(StripError);
  });
});
