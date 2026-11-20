import { describe, expect, it } from "vitest";
import { Album } from "@/models/Album";
import { GalleryImage } from "@/models/GalleryImage";
import { albumInput, albumPatch, galleryImageInput, galleryImagePatch } from "@/lib/validation";
import { GALLERY_UPLOAD_FORMATS, ALLOWED_UPLOAD_FORMATS } from "@/lib/cloudinary";

const url = "https://res.cloudinary.com/demo/image/upload/v1/vhq/gallery/a.jpg";

describe("GalleryImage model", () => {
  it("cannot be saved without alt text (missing, empty or only spaces)", () => {
    for (const alt of [undefined, "", "   "]) {
      const err = new GalleryImage({ imageUrl: url, alt }).validateSync();
      expect(err?.errors.alt, JSON.stringify(alt)).toBeTruthy();
    }
  });
  it("cannot be saved without a picture, and is a draft with no album by default", () => {
    expect(new GalleryImage({ alt: "A hill at dawn" }).validateSync()?.errors.imageUrl).toBeTruthy();
    const ok = new GalleryImage({ imageUrl: url, alt: "  A hill at dawn  " });
    expect(ok.validateSync()).toBeUndefined();
    expect(ok.alt).toBe("A hill at dawn");
    expect(ok.published).toBe(false);
    expect(ok.album).toBeNull();
    expect(ok.takenDate).toBeNull();
  });
  it("caps caption and alt text length", () => {
    expect(new GalleryImage({ imageUrl: url, alt: "a".repeat(201) }).validateSync()?.errors.alt).toBeTruthy();
    expect(new GalleryImage({ imageUrl: url, alt: "a", caption: "c".repeat(201) }).validateSync()?.errors.caption).toBeTruthy();
  });
});

describe("Album model", () => {
  it("needs a title", () => {
    expect(new Album({}).validateSync()?.errors.title).toBeTruthy();
    expect(new Album({ title: "Kigali" }).validateSync()).toBeUndefined();
  });
});

describe("galleryImageInput", () => {
  it("requires the picture AND the alt text", () => {
    expect(galleryImageInput.safeParse({ imageUrl: url }).success).toBe(false);
    expect(galleryImageInput.safeParse({ imageUrl: url, alt: "   " }).success).toBe(false);
    expect(galleryImageInput.safeParse({ alt: "x" }).success).toBe(false);
  });
  it("starts as an unpublished picture with no album, and cleans the text", () => {
    expect(galleryImageInput.parse({ imageUrl: url, alt: " A\u0000 hill " })).toMatchObject({ alt: "A hill", caption: "", album: null, takenDate: null, published: false, order: 0 });
  });
  it("takes only Cloudinary pictures (no sample files, no other sites)", () => {
    for (const bad of ["https://evil.example/a.jpg", "/samples/story.svg", ""]) expect(galleryImageInput.safeParse({ imageUrl: bad, alt: "x" }).success, bad).toBe(false);
  });
  it("checks album id and taken date, and treats empty text as not set", () => {
    expect(galleryImageInput.safeParse({ imageUrl: url, alt: "x", album: "not-an-id" }).success).toBe(false);
    expect(galleryImageInput.safeParse({ imageUrl: url, alt: "x", takenDate: "yesterday" }).success).toBe(false);
    expect(galleryImageInput.parse({ imageUrl: url, alt: "x", album: "", takenDate: "" })).toMatchObject({ album: null, takenDate: null });
    expect(galleryImageInput.parse({ imageUrl: url, alt: "x", album: "a".repeat(24), takenDate: "2026-05-01" })).toMatchObject({ album: "a".repeat(24), takenDate: "2026-05-01" });
  });
});

describe("galleryImagePatch / albums", () => {
  it("is partial, adds no defaults, and never lets the alt text be emptied", () => {
    expect(galleryImagePatch.parse({ published: true })).toEqual({ published: true });
    expect(galleryImagePatch.safeParse({ alt: "" }).success).toBe(false);
    expect(galleryImagePatch.parse({ album: "" })).toEqual({ album: null });
  });
  it("album input needs a title; patch is partial", () => {
    expect(albumInput.safeParse({}).success).toBe(false);
    expect(albumInput.parse({ title: " Kigali " })).toEqual({ title: "Kigali", description: "", order: 0 });
    expect(albumPatch.parse({ order: 3 })).toEqual({ order: 3 });
    expect(albumPatch.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("upload formats", () => {
  it("the gallery takes only formats whose location data is removed in the browser", () => {
    expect(GALLERY_UPLOAD_FORMATS.split(",").sort()).toEqual(["jpeg", "jpg", "png", "webp"]);
    for (const f of GALLERY_UPLOAD_FORMATS.split(",")) expect(ALLOWED_UPLOAD_FORMATS.split(",")).toContain(f);
    expect(GALLERY_UPLOAD_FORMATS).not.toMatch(/gif|avif/);
  });
});

import { galleryBatchInput, galleryOrderInput } from "@/lib/validation";
import { toAdminGalleryImage, toAdminAlbum } from "@/lib/admin-gallery";

describe("galleryBatchInput / galleryOrderInput", () => {
  const one = { imageUrl: url, alt: "x" };
  it("takes 1 to 20 pictures, each with its own alt text", () => {
    expect(galleryBatchInput.safeParse({ images: [] }).success).toBe(false);
    expect(galleryBatchInput.safeParse({ images: Array.from({ length: 10 }, () => one) }).success).toBe(true);
    expect(galleryBatchInput.safeParse({ images: Array.from({ length: 21 }, () => one) }).success).toBe(false);
    expect(galleryBatchInput.safeParse({ images: [one, { imageUrl: url, alt: "" }] }).success).toBe(false);
  });
  it("the new order must be real, non-repeating ids", () => {
    const a = "a".repeat(24), b = "b".repeat(24);
    expect(galleryOrderInput.safeParse({ ids: [a, b] }).success).toBe(true);
    expect(galleryOrderInput.safeParse({ ids: [a, a] }).success).toBe(false);
    expect(galleryOrderInput.safeParse({ ids: ["nope"] }).success).toBe(false);
    expect(galleryOrderInput.safeParse({ ids: [] }).success).toBe(false);
  });
  it("admin shapes are plain text and numbers", () => {
    expect(toAdminGalleryImage({ _id: "i1", imageUrl: url, alt: "a", album: "al1", takenDate: new Date("2026-05-01T10:00:00Z"), order: 3, published: true })).toEqual({ id: "i1", imageUrl: url, caption: "", alt: "a", album: "al1", takenDate: "2026-05-01", order: 3, published: true });
    expect(toAdminGalleryImage({ _id: "i2", imageUrl: url, alt: "a" })).toMatchObject({ album: "", takenDate: "", order: 0, published: false });
    expect(toAdminAlbum({ _id: "al1", title: "T" })).toEqual({ id: "al1", title: "T", description: "", order: 0 });
  });
});
