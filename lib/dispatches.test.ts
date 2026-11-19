import { describe, expect, it } from "vitest";
import { isLive, parseKind, selectLive } from "@/lib/dispatches";

const at = (iso: string) => new Date(iso);
const base = { published: true, date: at("2026-11-01T00:00:00Z") };

describe("isLive (fake clock)", () => {
  it("hides drafts", () => {
    expect(isLive({ ...base, published: false }, at("2026-11-20T00:00:00Z"))).toBe(false);
  });
  it("shows a scheduled item only once its publish date is reached", () => {
    const d = { ...base, publishAt: at("2026-11-20T10:00:00Z") };
    expect(isLive(d, at("2026-11-20T09:59:59Z"))).toBe(false);
    expect(isLive(d, at("2026-11-20T10:00:00Z"))).toBe(true);
  });
  it("expires an item at its expiry moment", () => {
    const d = { ...base, expireAt: at("2026-11-25T00:00:00Z") };
    expect(isLive(d, at("2026-11-24T23:59:59Z"))).toBe(true);
    expect(isLive(d, at("2026-11-25T00:00:00Z"))).toBe(false);
  });
  it("works with no dates, and with null dates", () => {
    expect(isLive(base, at("2030-01-01T00:00:00Z"))).toBe(true);
    expect(isLive({ ...base, publishAt: null, expireAt: null }, at("2030-01-01T00:00:00Z"))).toBe(true);
  });
  it("is only live inside the window", () => {
    const d = { ...base, publishAt: at("2026-11-20T00:00:00Z"), expireAt: at("2026-11-22T00:00:00Z") };
    expect([ "2026-11-19T23:00:00Z", "2026-11-21T00:00:00Z", "2026-11-22T01:00:00Z" ].map((t) => isLive(d, at(t)))).toEqual([false, true, false]);
  });
});

describe("selectLive", () => {
  it("drops items that are not live, puts pinned first, then newest first", () => {
    const now = at("2026-11-20T00:00:00Z");
    const items = [
      { id: "old", ...base, date: at("2026-10-01T00:00:00Z") },
      { id: "new", ...base, date: at("2026-11-10T00:00:00Z") },
      { id: "pinned-old", ...base, date: at("2026-09-01T00:00:00Z"), pinned: true },
      { id: "draft", ...base, published: false },
      { id: "expired", ...base, expireAt: at("2026-11-19T00:00:00Z") },
      { id: "later", ...base, publishAt: at("2026-12-01T00:00:00Z") },
    ];
    expect(selectLive(items, now).map((d) => d.id)).toEqual(["pinned-old", "new", "old"]);
  });
  it("does not change the list it was given", () => {
    const items = [{ id: "a", ...base }, { id: "b", ...base, published: false }];
    selectLive(items, at("2026-11-20T00:00:00Z"));
    expect(items.map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("parseKind", () => {
  it("accepts the five kinds and nothing else", () => {
    for (const k of ["news", "building", "learning", "win", "note"]) expect(parseKind(k)).toBe(k);
    for (const k of ["", "NEWS", "blog", null]) expect(parseKind(k)).toBeNull();
  });
});
