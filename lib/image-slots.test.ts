// @vitest-environment node
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SLOTS, aspectRatio, groupSlots, isAllowedPictureUrl, resolveSlots, slotDef } from "@/lib/image-slots";

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1/vhq/hero.jpg";

describe("slot registry", () => {
  it("has unique, well-formed keys and complete labels", () => {
    const keys = SLOTS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of SLOTS) {
      expect(s.key).toMatch(/^[a-z]+(\.[a-z0-9-]+)+$/);
      for (const f of [s.label, s.page, s.section, s.where]) expect(f.trim().length).toBeGreaterThan(3);
      expect(s.minWidth).toBeGreaterThan(0);
      expect(aspectRatio(s.aspect)).toBeGreaterThan(0.5);
    }
  });
  it("every default picture exists on disk and stays small", () => {
    for (const s of SLOTS) {
      const file = path.join(process.cwd(), "public", s.defaultSrc);
      expect(existsSync(file), s.defaultSrc).toBe(true);
      expect(statSync(file).size, s.defaultSrc).toBeLessThan(40 * 1024);
    }
  });
  it("lists the slots the plan promised (docs/book/05-image-slots.md)", () => {
    for (const k of ["home.hero.bg", "home.hero.character", "home.profile.photo", "museum.backdrop", "gallery.backdrop", "hire.handshake", "connect.backdrop", "avatar.figure", "site.og.default", "site.favicon", "site.notfound"]) {
      expect(slotDef(k), k).toBeDefined();
    }
  });
  it("groups by page in registry order", () => {
    const g = groupSlots();
    expect(g[0].page).toBe("Home");
    expect(g.flatMap((x) => x.slots)).toHaveLength(SLOTS.length);
  });
});

describe("resolveSlots", () => {
  it("returns every slot with its default when nothing is customised (also the no-database case)", () => {
    const r = resolveSlots([]);
    expect(Object.keys(r)).toHaveLength(SLOTS.length);
    for (const s of SLOTS) {
      expect(r[s.key].src).toBe(s.defaultSrc);
      expect(r[s.key].custom).toBe(false);
      expect(r[s.key].focal).toEqual({ x: 50, y: 50 });
    }
  });
  it("puts the owner's picture over the default and keeps its details", () => {
    const r = resolveSlots([{ key: "home.profile.photo", url: CLOUD, alt: "Frank at his desk", focal: { x: 30, y: 80 }, credit: "Frank", license: "own work" }]);
    expect(r["home.profile.photo"]).toMatchObject({ src: CLOUD, alt: "Frank at his desk", custom: true, credit: "Frank", license: "own work", focal: { x: 30, y: 80 } });
    expect(r["home.hero.bg"].custom).toBe(false);
  });
  it("decorative slots have no alt text, others fall back to their label", () => {
    const r = resolveSlots([{ key: "home.hero.bg", url: CLOUD, alt: "should be ignored" }, { key: "home.profile.photo", url: CLOUD }]);
    expect(r["home.hero.bg"].alt).toBe("");
    expect(r["home.profile.photo"].alt).toBe("Profile photo");
  });
  it("ignores unknown keys, empty addresses and addresses outside our Cloudinary", () => {
    const bad = ["", null, undefined, "http://res.cloudinary.com/x/y.jpg", "https://evil.example/x.jpg", "javascript:alert(1)", "/art/defaults/wide.svg", "https://res.cloudinary.com.evil.example/x.jpg", "https://res.cloudinary.com/x y.jpg"];
    const r = resolveSlots([{ key: "nope.nothing", url: CLOUD }, ...bad.map((url) => ({ key: "home.hero.bg", url }))]);
    expect(r["nope.nothing"]).toBeUndefined();
    expect(r["home.hero.bg"].custom).toBe(false);
    for (const u of bad) expect(isAllowedPictureUrl(u)).toBe(false);
    expect(isAllowedPictureUrl(CLOUD)).toBe(true);
  });
  it("keeps the focal point inside 0 to 100", () => {
    const r = resolveSlots([{ key: "home.hero.bg", url: CLOUD, focal: { x: -20, y: 900 } }, { key: "home.journey.bg", url: CLOUD, focal: { x: Number.NaN } }]);
    expect(r["home.hero.bg"].focal).toEqual({ x: 0, y: 100 });
    expect(r["home.journey.bg"].focal).toEqual({ x: 50, y: 50 });
  });
});
