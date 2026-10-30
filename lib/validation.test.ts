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
  it("accepts partial profile data and refuses external photo hosts", () => {
    expect(settingsPatch.safeParse({ profile: { name: "Frank" } }).success).toBe(true);
    expect(settingsPatch.safeParse({ profile: { photoUrl: "https://evil.example/me.png" } }).success).toBe(false);
  });
});
