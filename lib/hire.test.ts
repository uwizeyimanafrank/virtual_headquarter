import { describe, expect, it } from "vitest";
import { HIRE_DEFAULTS, availabilityBadge, hireInput, resolveHire } from "@/lib/hire";
import { parseLinks } from "@/lib/hire-links";
import { hireRequestInput } from "@/lib/validation";
import { HireRequest } from "@/models/HireRequest";

describe("HIRE_DEFAULTS", () => {
  it("are valid against the same rules the Office save will use, so the page is complete from day one", () => {
    expect(hireInput.safeParse(HIRE_DEFAULTS).success).toBe(true);
    expect(HIRE_DEFAULTS.steps).toHaveLength(3);
  });
});

describe("resolveHire", () => {
  it("uses the defaults for nothing, for junk, and for an empty object", () => {
    for (const v of [undefined, null, "x", 5, [], {}]) expect(resolveHire(v)).toEqual(HIRE_DEFAULTS);
  });
  it("uses what the owner wrote, trimmed and cleaned", () => {
    const r = resolveHire({ headline: "  Hire me  ", intro: "Hi\u0000 there", faq: [] });
    expect(r.headline).toBe("Hire me");
    expect(r.intro).toBe("Hi there");
    expect(r.faq).toEqual([]); // an empty FAQ is allowed (the section just hides)
    expect(r.services).toEqual(HIRE_DEFAULTS.services); // untouched parts keep the defaults
  });
  it("one damaged part falls back to its own default and never blanks the page", () => {
    const good = [{ title: "A", text: "B" }];
    const r = resolveHire({ headline: "Mine", services: good, steps: [{ title: "only one", text: "x" }], availability: { status: "from", from: "" }, faq: "nope" });
    expect(r.headline).toBe("Mine");
    expect(r.services).toEqual(good);
    expect(r.steps).toEqual(HIRE_DEFAULTS.steps); // needs exactly 3
    expect(r.availability).toEqual(HIRE_DEFAULTS.availability); // "from" without a date is refused
    expect(r.faq).toEqual(HIRE_DEFAULTS.faq);
  });
  it("refuses over-long text instead of cutting it silently", () => {
    expect(resolveHire({ headline: "x".repeat(101) }).headline).toBe(HIRE_DEFAULTS.headline);
  });
});

describe("hireInput (what the Office may save)", () => {
  const ok = { ...HIRE_DEFAULTS };
  it("needs a headline, 1 to 6 services, exactly 3 steps and at most 10 questions", () => {
    expect(hireInput.safeParse({ ...ok, headline: "" }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, services: [] }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, services: Array.from({ length: 7 }, () => ({ title: "a", text: "b" })) }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, steps: ok.steps.slice(0, 2) }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, faq: Array.from({ length: 11 }, () => ({ q: "a", a: "b" })) }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, faq: [{ q: "a", a: "" }] }).success).toBe(false);
  });
  it("'available from' needs a real date", () => {
    expect(hireInput.safeParse({ ...ok, availability: { status: "from", from: "", note: "" } }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, availability: { status: "from", from: "next month", note: "" } }).success).toBe(false);
    expect(hireInput.safeParse({ ...ok, availability: { status: "from", from: "2027-01-12", note: "" } }).success).toBe(true);
    expect(hireInput.safeParse({ ...ok, availability: { status: "maybe", from: "", note: "" } }).success).toBe(false);
  });
});

describe("availabilityBadge (fake clock)", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  it("open and busy", () => {
    expect(availabilityBadge({ status: "open", from: "", note: "" }, now)).toEqual({ tone: "open", label: "Open to new work" });
    expect(availabilityBadge({ status: "busy", from: "", note: "" }, now)).toEqual({ tone: "busy", label: "Fully booked right now" });
  });
  it("a future date says when, and flips to open by itself on the day", () => {
    const a = { status: "from" as const, from: "2026-12-01", note: "" };
    expect(availabilityBadge(a, now)).toEqual({ tone: "soon", label: "Available from 1 December 2026" });
    expect(availabilityBadge(a, new Date("2026-11-30T23:59:59Z")).tone).toBe("soon");
    expect(availabilityBadge(a, new Date("2026-12-01T00:00:00Z")).tone).toBe("open");
    expect(availabilityBadge(a, new Date("2027-03-01T00:00:00Z"))).toEqual({ tone: "open", label: "Open to new work" });
  });
});

describe("parseLinks", () => {
  it("splits lines and commas, drops empties, and adds https:// to bare addresses", () => {
    expect(parseLinks("example.com\n\n  https://github.com/x/y , http://a.b/c \r\nwww.site.rw")).toEqual(["https://example.com", "https://github.com/x/y", "http://a.b/c", "https://www.site.rw"]);
    expect(parseLinks("")).toEqual([]);
    expect(parseLinks("  \n  ")).toEqual([]);
  });
});

describe("hireRequestInput", () => {
  const base = { name: "Ada", email: "ADA@Example.com ", kind: "project", message: "We need a booking site by March." };
  it("takes a valid request, cleans it, and fills the optional parts", () => {
    expect(hireRequestInput.parse(base)).toMatchObject({ name: "Ada", email: "ada@example.com", company: "", budget: "", timeline: "", links: [], kind: "project" });
  });
  it("needs name, a real email, a known kind and a message of at least 10 characters", () => {
    for (const bad of [{ name: "" }, { email: "nope" }, { kind: "slave" }, { kind: undefined }, { message: "short" }, { message: "   " }]) {
      expect(hireRequestInput.safeParse({ ...base, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });
  it("has hard size limits", () => {
    for (const bad of [{ name: "x".repeat(81) }, { company: "x".repeat(121) }, { budget: "x".repeat(81) }, { timeline: "x".repeat(121) }, { message: "x".repeat(3001) }, { email: `${"a".repeat(160)}@x.co` }]) {
      expect(hireRequestInput.safeParse({ ...base, ...bad }).success, Object.keys(bad)[0]).toBe(false);
    }
  });
  it("links: web addresses only, at most 5", () => {
    expect(hireRequestInput.safeParse({ ...base, links: ["https://a.co", "http://b.co/x"] }).success).toBe(true);
    for (const links of [["javascript:alert(1)"], ["ftp://x.co"], ["not a link"], Array.from({ length: 6 }, () => "https://a.co"), ["https://" + "a".repeat(300)]]) {
      expect(hireRequestInput.safeParse({ ...base, links }).success).toBe(false);
    }
  });
  it("keeps the honeypot field so the route can see it, and strips control characters", () => {
    expect(hireRequestInput.parse({ ...base, website: "http://spam" }).website).toBe("http://spam");
    expect(hireRequestInput.parse({ ...base, name: "A\u0000da" }).name).toBe("Ada");
  });
});

describe("HireRequest model", () => {
  const ok = { name: "Ada", email: "a@b.co", kind: "contract", message: "Hello there friend" };
  it("starts as a new, unread request that is not starred", () => {
    const d = new HireRequest(ok);
    expect(d.validateSync()).toBeUndefined();
    expect(d).toMatchObject({ status: "new", priority: false, read: false, notes: "", links: [] });
  });
  it("needs name, email, kind and message, and only known kinds and statuses", () => {
    for (const k of ["name", "email", "kind", "message"] as const) expect(new HireRequest({ ...ok, [k]: undefined }).validateSync()?.errors[k], k).toBeTruthy();
    expect(new HireRequest({ ...ok, kind: "other" }).validateSync()?.errors.kind).toBeTruthy();
    expect(new HireRequest({ ...ok, status: "maybe" }).validateSync()?.errors.status).toBeTruthy();
    expect(new HireRequest({ ...ok, links: Array.from({ length: 6 }, () => "https://a.co") }).validateSync()).toBeTruthy();
  });
});
