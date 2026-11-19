import { describe, expect, it } from "vitest";
import { dispatchState, toAdminDispatch } from "@/lib/admin-dispatches";
import { SAMPLE_DISPATCHES } from "@/lib/dispatches-samples";
import { DISPATCH_KINDS } from "@/lib/dispatches";
import { dispatchInput, dispatchPatch } from "@/lib/validation";

describe("dispatchInput", () => {
  it("needs only a title and fills the rest with safe defaults (a draft)", () => {
    const r = dispatchInput.parse({ title: "  Hello  " });
    expect(r).toMatchObject({ title: "Hello", text: "", kind: "note", published: false, pinned: false, publishAt: null, expireAt: null });
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("rejects an empty title, unknown kind, bad date and non-Cloudinary media", () => {
    for (const bad of [{ title: "" }, { title: "a", kind: "blog" }, { title: "a", date: "11/20/2026" }, { title: "a", imageUrl: "https://evil.example/x.png" }, { title: "a", video: "https://youtube.com/watch?v=1" }, { title: "a".repeat(121) }, { title: "a", text: "x".repeat(601) }]) {
      expect(dispatchInput.safeParse(bad).success).toBe(false);
    }
  });
  it("takes ISO schedule moments, treats empty text as not set, and keeps expiry after start", () => {
    expect(dispatchInput.parse({ title: "a", publishAt: "", expireAt: "" })).toMatchObject({ publishAt: null, expireAt: null });
    expect(dispatchInput.safeParse({ title: "a", publishAt: "2026-11-20T10:00:00.000Z", expireAt: "2026-11-21T10:00:00.000Z" }).success).toBe(true);
    expect(dispatchInput.safeParse({ title: "a", publishAt: "2026-11-21T10:00:00.000Z", expireAt: "2026-11-20T10:00:00.000Z" }).success).toBe(false);
    expect(dispatchInput.safeParse({ title: "a", publishAt: "tomorrow" }).success).toBe(false);
  });
  it("strips control characters from text", () => {
    expect(dispatchInput.parse({ title: "a\u0000b" }).title).toBe("ab");
  });
});

describe("dispatchPatch", () => {
  it("is partial and adds no defaults, so a small change never wipes other fields", () => {
    expect(dispatchPatch.parse({ pinned: true })).toEqual({ pinned: true });
    expect(dispatchPatch.parse({})).toEqual({});
  });
  it("can clear a schedule with null", () => {
    expect(dispatchPatch.parse({ publishAt: null, expireAt: "" })).toEqual({ publishAt: null, expireAt: null });
  });
});

describe("dispatchState (fake clock)", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("names where a dispatch stands", () => {
    expect(dispatchState({ published: false, publishAt: "", expireAt: "" }, now)).toBe("draft");
    expect(dispatchState({ published: true, publishAt: "2026-11-21T00:00:00.000Z", expireAt: "" }, now)).toBe("scheduled");
    expect(dispatchState({ published: true, publishAt: "", expireAt: "2026-11-20T12:00:00.000Z" }, now)).toBe("expired");
    expect(dispatchState({ published: true, publishAt: "", expireAt: "" }, now)).toBe("live");
  });
});

describe("toAdminDispatch and samples", () => {
  it("turns a database row into plain text fields", () => {
    const a = toAdminDispatch({ _id: "abc", title: "T", date: new Date("2026-11-01T10:00:00Z"), publishAt: null, expireAt: new Date("2026-12-01T00:00:00Z"), published: true });
    expect(a).toMatchObject({ id: "abc", kind: "note", date: "2026-11-01", publishAt: "", expireAt: "2026-12-01T00:00:00.000Z", published: true, pinned: false, isSample: false });
  });
  it("ships three obviously fake sample dispatches with valid kinds", () => {
    expect(SAMPLE_DISPATCHES).toHaveLength(3);
    for (const s of SAMPLE_DISPATCHES) { expect(DISPATCH_KINDS).toContain(s.kind); expect(s.text).toContain("SAMPLE"); expect(dispatchInput.safeParse({ title: s.title, text: s.text, kind: s.kind }).success).toBe(true); }
  });
});
