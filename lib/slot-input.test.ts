// @vitest-environment node
import { describe, expect, it } from "vitest";
import { slotDef } from "@/lib/image-slots";
import { parseSlotUpdate } from "@/lib/slot-input";

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/a.jpg";
const decorative = slotDef("home.hero.bg")!;
const meaningful = slotDef("home.profile.photo")!;

describe("parseSlotUpdate", () => {
  it("accepts a Cloudinary picture and fills the defaults", () => {
    const r = parseSlotUpdate(decorative, { url: CLOUD });
    expect(r).toEqual({ ok: true, data: { url: CLOUD, alt: "", credit: "", license: "", kind: "upload", focal: { x: 50, y: 50 } } });
  });
  it("refuses addresses outside our Cloudinary", () => {
    for (const url of ["http://res.cloudinary.com/x/y.jpg", "https://evil.example/a.jpg", "/art/defaults/wide.svg", "javascript:alert(1)", "", 5, undefined]) {
      expect(parseSlotUpdate(decorative, { url }).ok).toBe(false);
    }
  });
  it("requires a description only where the picture carries meaning", () => {
    expect(parseSlotUpdate(meaningful, { url: CLOUD }).ok).toBe(false);
    expect(parseSlotUpdate(meaningful, { url: CLOUD, alt: "  " }).ok).toBe(false);
    expect(parseSlotUpdate(meaningful, { url: CLOUD, alt: "Frank at his desk" }).ok).toBe(true);
  });
  it("trims text, limits length and checks the focus point", () => {
    expect(parseSlotUpdate(decorative, { url: CLOUD, credit: "  Frank  " })).toMatchObject({ ok: true, data: { credit: "Frank" } });
    expect(parseSlotUpdate(decorative, { url: CLOUD, credit: "x".repeat(201) }).ok).toBe(false);
    expect(parseSlotUpdate(decorative, { url: CLOUD, focal: { x: 101, y: 0 } }).ok).toBe(false);
    expect(parseSlotUpdate(decorative, { url: CLOUD, focal: { x: -1, y: 0 } }).ok).toBe(false);
    expect(parseSlotUpdate(decorative, { url: CLOUD, kind: "import" }).ok).toBe(false); // only upload or library for now
  });
  it("refuses a body that is not an object", () => {
    for (const b of [null, "x", 5, []]) expect(parseSlotUpdate(decorative, b).ok).toBe(false);
  });
});
