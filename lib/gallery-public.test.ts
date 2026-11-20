import { describe, expect, it } from "vitest";
import { buildGallery, hashId, shapeOf, tiltOf } from "@/lib/gallery";
import { photoUrls } from "@/lib/media";

const U = (n: number) => `https://res.cloudinary.com/demo/image/upload/v1/vhq/gallery/${n}.jpg`;
const row = (n: number, over: Record<string, unknown> = {}) => ({ _id: `i${n}`, imageUrl: U(n), alt: `Alt ${n}`, caption: "", album: null, takenDate: null, order: n, published: true, ...over });
const album = (id: string, order: number, title = id) => ({ _id: id, title, description: "", order });

describe("photoUrls", () => {
  it("never returns the stored original: every Cloudinary size is a resized, format-picked link", () => {
    const p = photoUrls(U(1));
    expect(p.src).toContain("/image/upload/f_auto,q_auto,w_640,c_limit/");
    expect(p.full).toContain("w_1600");
    expect(p.blur).toContain("w_24");
    expect(p.blur).toContain("e_blur");
    for (const u of [p.src, p.full, p.blur]) expect(u).not.toBe(U(1));
  });
  it("leaves bundled drawings alone and has no blur for them", () => {
    expect(photoUrls("/samples/story.svg")).toEqual({ src: "/samples/story.svg", full: "/samples/story.svg", blur: "" });
  });
});

describe("buildGallery", () => {
  it("shows only published pictures", () => {
    const c = buildGallery([], [row(1), row(2, { published: false })]);
    expect(c).toHaveLength(1);
    expect(c[0].photos.map((p) => p.id)).toEqual(["i1"]);
  });
  it("puts albums in their order as chapters (pictures in their order), then pictures with no album last", () => {
    const c = buildGallery(
      [album("b", 2), album("a", 1)],
      [row(1, { album: "b", order: 2 }), row(2, { album: "b", order: 1 }), row(3, { album: "a" }), row(4)],
    );
    expect(c.map((x) => x.id)).toEqual(["a", "b", ""]);
    expect(c[1].photos.map((p) => p.id)).toEqual(["i2", "i1"]);
    expect(c[2].photos.map((p) => p.id)).toEqual(["i4"]);
  });
  it("leaves out an album with nothing published, and treats a picture of a deleted album as having no album", () => {
    const c = buildGallery([album("a", 1), album("empty", 2)], [row(1, { album: "a" }), row(2, { album: "empty", published: false }), row(3, { album: "gone" })]);
    expect(c.map((x) => x.id)).toEqual(["a", ""]);
    expect(c[1].photos.map((p) => p.id)).toEqual(["i3"]);
  });
  it("is empty when nothing is published", () => { expect(buildGallery([album("a", 1)], [row(1, { published: false })])).toEqual([]); });
  it("gives visitors only plain text fields (no stored link)", () => {
    const [p] = buildGallery([], [row(1, { caption: "Hi", takenDate: new Date("2026-05-01T10:00:00Z") })])[0].photos;
    expect(Object.keys(p).sort()).toEqual(["alt", "blur", "caption", "full", "id", "src", "takenDate"]);
    expect(p).toMatchObject({ caption: "Hi", takenDate: "2026-05-01", alt: "Alt 1" });
  });
});

describe("steady tilt and shape", () => {
  it("are the same every time for the same picture, and stay in range", () => {
    expect(hashId("abc")).toBe(hashId("abc"));
    for (const id of ["a", "b", "c", "507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]) {
      expect(tiltOf(id)).toBe(tiltOf(id));
      expect(tiltOf(id)).toBeGreaterThanOrEqual(-3);
      expect(tiltOf(id)).toBeLessThanOrEqual(3);
      expect(["4 / 5", "1 / 1", "4 / 3", "3 / 4"]).toContain(shapeOf(id));
    }
  });
  it("always gives a real shape, for many ids (large hash values used to give a negative index)", () => {
    for (let n = 0; n < 5000; n++) expect(["4 / 5", "1 / 1", "4 / 3", "3 / 4"], `id-${n}`).toContain(shapeOf(`id-${n}`));
  });
  it("varies between pictures (not all the same)", () => {
    const ids = Array.from({ length: 40 }, (_, n) => `id-${n}`);
    expect(new Set(ids.map(tiltOf)).size).toBeGreaterThan(3);
    expect(new Set(ids.map(shapeOf)).size).toBeGreaterThan(1);
  });
});
