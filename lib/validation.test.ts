// @vitest-environment node
import { describe, expect, it } from "vitest";
import { contactInput, museumItemInput, museumItemPatch, settingsPatch } from "@/lib/validation";

const ok = { type: "project", title: "T", date: "2026-03" };

describe("museumItemInput (create)", () => {
  it("fills safe defaults", () => {
    const r = museumItemInput.parse(ok);
    expect(r).toMatchObject({ status: "draft", parallaxSpeed: 0.5, order: 0, description: "", mediaUrl: "" });
    expect(r.metadata.skills).toEqual([]);
  });
  it("rejects bad dates, types and empty titles", () => {
    expect(museumItemInput.safeParse({ ...ok, date: "2026-13" }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...ok, type: "hack" }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...ok, title: "   " }).success).toBe(false);
  });
  it("only accepts Cloudinary or bundled sample images", () => {
    expect(museumItemInput.safeParse({ ...ok, mediaUrl: "https://res.cloudinary.com/x/image/upload/a.jpg" }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...ok, mediaUrl: "/samples/book.svg" }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...ok, mediaUrl: "https://evil.example/a.png" }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...ok, mediaUrl: "https://res.cloudinary.com.evil.example/a.png" }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...ok, mediaUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("only accepts http(s) links", () => {
    expect(museumItemInput.safeParse({ ...ok, metadata: { gradeOrLink: "javascript:alert(1)", skills: [] } }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...ok, metadata: { gradeOrLink: "https://example.org", skills: [] } }).success).toBe(true);
  });
  it("strips invisible control characters from text", () => {
    expect(museumItemInput.parse({ ...ok, title: "Hi\u0000 there\u0007" }).title).toBe("Hi there");
  });
  it("limits skills", () => {
    expect(museumItemInput.safeParse({ ...ok, metadata: { skills: Array.from({ length: 21 }, (_, i) => `s${i}`) } }).success).toBe(false);
  });
});

describe("museumItemPatch (update)", () => {
  it("does NOT add defaults, so a partial update cannot reset other fields", () => {
    expect(museumItemPatch.parse({ status: "published" })).toEqual({ status: "published" });
    expect(museumItemPatch.parse({ metadata: { howIEarnedIt: "x" } })).toEqual({ metadata: { howIEarnedIt: "x" } });
  });
  it("still validates what is sent", () => {
    expect(museumItemPatch.safeParse({ date: "nope" }).success).toBe(false);
  });
});

describe("contactInput", () => {
  it("normalises the email and rejects bad ones", () => {
    expect(contactInput.parse({ name: "A", email: " A@B.CO ", message: "hi" }).email).toBe("a@b.co");
    expect(contactInput.safeParse({ name: "A", email: "nope", message: "hi" }).success).toBe(false);
  });
  it("limits the message length", () => {
    expect(contactInput.safeParse({ name: "A", email: "a@b.co", message: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("settingsPatch", () => {
  it("accepts a Cloudinary AI Twin picture and refuses other hosts", () => {
    expect(settingsPatch.safeParse({ twinAvatarUrl: "https://res.cloudinary.com/x/image/upload/twin.png" }).success).toBe(true);
    expect(settingsPatch.safeParse({ twinAvatarUrl: "" }).success).toBe(true);
    expect(settingsPatch.safeParse({ twinAvatarUrl: "https://evil.example/t.png" }).success).toBe(false);
  });
  it("accepts partial profile data and refuses external photo hosts", () => {
    expect(settingsPatch.safeParse({ profile: { name: "Frank" } }).success).toBe(true);
    expect(settingsPatch.safeParse({ profile: { photoUrl: "https://evil.example/me.png" } }).success).toBe(false);
  });
});

describe("featured work fields (P11-T14)", () => {
  const base = { type: "project", title: "Shop", date: "2026-01" };
  it("accepts problem, whatIDid, result and featured, and caps each text at 300", () => {
    expect(museumItemInput.safeParse({ ...base, metadata: { skills: [], problem: "a", whatIDid: "b", result: "c", featured: true } }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...base, metadata: { skills: [], problem: "x".repeat(301) } }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...base, metadata: { skills: [], featured: "yes" } }).success).toBe(false);
  });
});

describe("CV link (P11-T15)", () => {
  it("accepts an https link or empty, refuses anything else", () => {
    expect(settingsPatch.safeParse({ profile: { cvUrl: "https://x.dev/cv.pdf" } }).success).toBe(true);
    expect(settingsPatch.safeParse({ profile: { cvUrl: "" } }).success).toBe(true);
    expect(settingsPatch.safeParse({ profile: { cvUrl: "javascript:alert(1)" } }).success).toBe(false);
  });
});

describe("effect switches (P11-T17)", () => {
  it("accepts some or all switches as booleans and refuses other values", () => {
    expect(settingsPatch.safeParse({ effects: { cursorGlow: false } }).success).toBe(true);
    expect(settingsPatch.safeParse({ effects: { cursorGlow: "off" } }).success).toBe(false);
  });
});

describe("Museum display, gallery and video (P12-T01)", () => {
  const base = { type: "project", title: "Shop", date: "2026-01" };
  it("old items without the new fields still validate, with safe defaults", () => {
    const r = museumItemInput.parse(base);
    expect(r.display).toBe("both");
    expect(r.gallery).toEqual([]);
    expect(r.video).toBe("");
  });
  it("accepts tour, case or both and refuses anything else", () => {
    for (const d of ["tour", "case", "both"]) expect(museumItemInput.safeParse({ ...base, display: d }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...base, display: "attic" }).success).toBe(false);
  });
  it("gallery: up to 8 allowed picture addresses", () => {
    const ok = "https://res.cloudinary.com/demo/image/upload/a.jpg";
    expect(museumItemInput.safeParse({ ...base, gallery: [ok, "/samples/project.svg"] }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...base, gallery: Array(9).fill(ok) }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...base, gallery: ["https://evil.example/a.jpg"] }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...base, gallery: [""] }).success).toBe(false);
  });
  it("video must be a Cloudinary https address or empty", () => {
    expect(museumItemInput.safeParse({ ...base, video: "https://res.cloudinary.com/demo/video/upload/v.mp4" }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...base, video: "" }).success).toBe(true);
    expect(museumItemInput.safeParse({ ...base, video: "https://youtube.com/watch?v=x" }).success).toBe(false);
    expect(museumItemInput.safeParse({ ...base, video: "javascript:alert(1)" }).success).toBe(false);
  });
  it("a partial update never fills these in by itself", () => {
    expect(museumItemPatch.parse({ title: "x" })).toEqual({ title: "x" });
    expect(museumItemPatch.parse({ display: "case" })).toEqual({ display: "case" });
  });
});
