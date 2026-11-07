// @vitest-environment node
import { describe, expect, it } from "vitest";
import { demoHome, demoMuseum } from "@/lib/demo";

describe("demo content (shown before a database is connected)", () => {
  it("Home has a profile, a hero and items, so the site never looks empty", () => {
    const d = demoHome();
    expect(d.demo).toBe(true);
    expect(d.profile.name).not.toBe("");
    expect(d.heroTitle).not.toBe("");
    expect(d.items.length).toBeGreaterThanOrEqual(4);
    expect(new Set(d.items.map((i) => i.type)).size).toBeGreaterThanOrEqual(4); // story, certificate, project, book
    expect(d.items.every((i) => i.mediaUrl.startsWith("/samples/"))).toBe(true); // built-in pictures, no Cloudinary needed
  });
  it("Museum has every chapter filled, all marked as sample, with unique ids", () => {
    const m = demoMuseum();
    expect(m.demo).toBe(true);
    expect(m.chapters.map((c) => c.key)).toEqual(["about", "certificates", "projects", "library"]);
    for (const c of m.chapters) expect(c.items.length).toBeGreaterThan(0);
    const all = m.chapters.flatMap((c) => c.items);
    expect(all.every((i) => i.isSample)).toBe(true);
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
  });
});
