// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_CARDS, MIN_CARDS, MOOD_LINES, buildCards, cardLook, hashText, isPlaceholderPicture, oneLine } from "@/lib/card-wall";
import type { HomeItem } from "@/lib/home";

const item = (n: number, over: Partial<HomeItem> = {}): HomeItem => ({ id: `item-${n}`, type: "project", title: `Project ${n}`, date: "2026-01", description: `Built thing ${n}. It did well.`, mediaUrl: `https://res.cloudinary.com/demo/image/upload/v1/p${n}.jpg`, skills: [], link: "", ...over });

describe("oneLine", () => {
  it("keeps the first sentence, tidies spaces, and shortens long text", () => {
    expect(oneLine("First one.  Second one.")).toBe("First one.");
    expect(oneLine("  spaced \n out  ")).toBe("spaced out");
    const long = oneLine("x".repeat(300));
    expect(long.length).toBe(90);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("buildCards", () => {
  it("is never empty: with no items there are still 12 mood cards, all marked as samples", () => {
    const c = buildCards([]);
    expect(c).toHaveLength(MIN_CARDS);
    expect(c.every((x) => x.kind === "mood" && x.sample && x.line.length > 5)).toBe(true);
  });
  it("puts the owner's items first and slips a mood card after every two", () => {
    const c = buildCards([item(1), item(2), item(3), item(4)]);
    expect(c.slice(0, 6).map((x) => x.kind)).toEqual(["item", "item", "mood", "item", "item", "mood"]);
    expect(c).toHaveLength(MIN_CARDS);
  });
  it("turns an item into a card with tag, one line, image and a link to its case", () => {
    const [c] = buildCards([item(7, { type: "certificate", id: "a b" })]);
    expect(c).toMatchObject({ kind: "item", tag: "Certificate", title: "Project 7", line: "Built thing 7.", href: "/museum#case=a%20b", sample: false });
    expect(c.image).toContain("res.cloudinary.com");
  });
  it("marks the built-in demo items as samples and skips items without a picture", () => {
    const c = buildCards([item(1, { id: "demo-3" }), item(2, { mediaUrl: "" })]);
    expect(c[0].sample).toBe(true);
    expect(c.some((x) => x.title === "Project 2")).toBe(false);
  });
  it("swaps the built-in sample pictures (they have words in them) for a drawn scene, and calls the card a sample", () => {
    const c = buildCards([item(1, { mediaUrl: "/samples/project.svg", id: "p1" }), item(2, { mediaUrl: "/samples/book.svg", id: "p2" })]);
    expect(c[0].image.startsWith("/art/")).toBe(true);
    expect(c[0].sample && c[1].sample).toBe(true);
    expect(c[0].image).not.toBe(c[1].image);
    expect(isPlaceholderPicture("/samples/x.svg")).toBe(true);
    expect(isPlaceholderPicture("https://res.cloudinary.com/demo/image/upload/v1/a.jpg")).toBe(false);
  });
  it("never goes over 24, even with many items", () => {
    const c = buildCards(Array.from({ length: 60 }, (_, i) => item(i)));
    expect(c).toHaveLength(MAX_CARDS);
    expect(buildCards([], { max: 999 }).length).toBeLessThanOrEqual(MAX_CARDS);
  });
  it("has unique ids and real pictures on every card", () => {
    const c = buildCards(Array.from({ length: 30 }, (_, i) => item(i)));
    expect(new Set(c.map((x) => x.id)).size).toBe(c.length);
    expect(c.every((x) => x.image.length > 5)).toBe(true);
    expect(MOOD_LINES.every((l) => l.length <= 70)).toBe(true);
  });
});

describe("cardLook", () => {
  it("is the same for the same card and gives a slight tilt, a small offset and one of three shapes", () => {
    expect(cardLook("x")).toEqual(cardLook("x"));
    const looks = Array.from({ length: 200 }, (_, i) => cardLook(`id-${i}`));
    expect(looks.every((l) => Math.abs(l.rotate) <= 3.6 && Math.abs(l.lift) <= 16)).toBe(true);
    expect(new Set(looks.map((l) => l.shape))).toEqual(new Set(["tall", "wide", "square"]));
    expect(new Set(looks.map((l) => l.rotate)).size).toBeGreaterThan(5);
  });
  it("hashText is stable", () => { expect(hashText("abc")).toBe(hashText("abc")); expect(hashText("abc")).not.toBe(hashText("abd")); });
});
