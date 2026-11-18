import { describe, expect, it } from "vitest";
import { availableChips, casesItems, chipOf, filterCases } from "@/lib/cases";
import type { MuseumChapter, MuseumItemData } from "@/lib/museum";

const mk = (id: string, o: Partial<MuseumItemData> = {}): MuseumItemData => ({ id, type: "project", title: id, date: "2026-01", description: "", mediaUrl: "", parallaxSpeed: 0.5, skills: [], link: "", howIEarnedIt: "", isSample: false, display: "both", gallery: [], video: "", featured: false, ...o });

describe("cases hall logic", () => {
  it("shows only items marked case or both, across all chapters, in order", () => {
    const chs = [{ key: "projects", title: "P", items: [mk("a", { display: "tour" }), mk("b", { display: "case" })] }, { key: "library", title: "L", items: [mk("c"), mk("d", { display: "tour" })] }] as MuseumChapter[];
    expect(casesItems(chs).map((i) => i.id)).toEqual(["b", "c"]);
  });
  it("stories go under Other", () => {
    expect([chipOf("story"), chipOf("book"), chipOf("certificate")]).toEqual(["other", "book", "certificate"]);
  });
  it("only offers chips that have pieces", () => {
    expect(availableChips([mk("a"), mk("b", { type: "book" })])).toEqual(["all", "project", "book"]);
    expect(availableChips([])).toEqual(["all"]);
  });
  it("filters by chip", () => {
    const xs = [mk("p"), mk("b", { type: "book" }), mk("s", { type: "story" })];
    expect(filterCases(xs, "book", "").map((i) => i.id)).toEqual(["b"]);
    expect(filterCases(xs, "other", "").map((i) => i.id)).toEqual(["s"]);
    expect(filterCases(xs, "all", "").length).toBe(3);
  });
  it("searches title, text and skills; every word must match; ignores case and accents", () => {
    const xs = [mk("Café shop", { skills: ["React"] }), mk("Other", { description: "built with node" })];
    expect(filterCases(xs, "all", "cafe").map((i) => i.id)).toEqual(["Café shop"]);
    expect(filterCases(xs, "all", "REACT cafe").length).toBe(1);
    expect(filterCases(xs, "all", "react node").length).toBe(0);
    expect(filterCases(xs, "all", "NODE").map((i) => i.id)).toEqual(["Other"]);
  });
  it("featured pieces come first, others keep their order", () => {
    const xs = [mk("a"), mk("b", { featured: true }), mk("c"), mk("d", { featured: true })];
    expect(filterCases(xs, "all", "").map((i) => i.id)).toEqual(["b", "d", "a", "c"]);
  });
});
