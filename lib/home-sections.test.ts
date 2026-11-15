import { describe, expect, it } from "vitest";
import { buildCards, buildJourney, buildStats, isSampleItem, MAX_STEPS, SAMPLE_STEPS } from "@/lib/home-sections";
import type { HomeItem } from "@/lib/home";

const item = (o: Partial<HomeItem>): HomeItem => ({ id: "a", type: "project", title: "T", date: "2025-01", description: "d", mediaUrl: "https://x/y.jpg", skills: [], link: "", ...o });

describe("buildStats", () => {
  it("shows only stats with both a number and a label, never invents one", () => {
    const c = { stat1Value: "2", stat1Label: "Internships", stat2Value: "9", stat2Label: "", stat3Value: "", stat3Label: "Lonely label", stat4Value: " L5 ", stat4Label: " Diploma " };
    expect(buildStats(c)).toEqual([{ value: "2", label: "Internships" }, { value: "L5", label: "Diploma" }]);
  });
  it("is empty when nothing is filled in", () => expect(buildStats({})).toEqual([]));
});

describe("buildCards", () => {
  it("needs a title, keeps the text optional, skips empty cards", () => {
    expect(buildCards({ card1Title: "A", card1Text: "x", card2Title: "", card2Text: "orphan", card3Title: "C" })).toEqual([{ title: "A", text: "x" }, { title: "C", text: "" }]);
  });
});

describe("buildJourney", () => {
  it("goes from oldest to newest and leaves out books and references", () => {
    const steps = buildJourney([item({ id: "2", date: "2026-02", title: "New" }), item({ id: "b", type: "book", date: "2020-01" }), item({ id: "1", type: "story", date: "2024-01", title: "Old" })]);
    expect(steps.map((s) => s.title)).toEqual(["Old", "New"]);
    expect(steps[0].kind).toBe("Story");
  });
  it(`keeps at most ${MAX_STEPS} steps`, () => {
    expect(buildJourney(Array.from({ length: 20 }, (_, i) => item({ id: `i${i}`, date: `2020-${String(i % 12 + 1).padStart(2, "0")}` }))).length).toBe(MAX_STEPS);
  });
  it("shows clearly marked samples when there is nothing real", () => {
    for (const items of [[], [item({ type: "book" })]]) {
      const s = buildJourney(items);
      expect(s).toEqual([...SAMPLE_STEPS]);
      expect(s.every((x) => x.sample)).toBe(true);
    }
  });
  it("marks built-in sample items as sample, and real ones not", () => {
    expect(isSampleItem(item({ id: "demo-1" }))).toBe(true);
    expect(isSampleItem(item({ title: "Sample project: X" }))).toBe(true);
    expect(isSampleItem(item({ mediaUrl: "/samples/project.svg" }))).toBe(true);
    expect(isSampleItem(item({}))).toBe(false);
    expect(buildJourney([item({ id: "r" })])[0].sample).toBe(false);
  });
});

import { buildFeatured } from "@/lib/home-sections";
describe("buildFeatured", () => {
  const full = { type: "project", featured: true, problem: "p", whatIDid: "w", result: "r" };
  it("needs a project, picked as featured, with all three parts", () => {
    const out = buildFeatured([item({ id: "1", ...full }), item({ id: "2", ...full, featured: false }), item({ id: "3", ...full, result: "" }), item({ id: "4", ...full, type: "story" })]);
    expect(out.map((x) => x.id)).toEqual(["1"]);
  });
  it("shows at most 3, newest first, with tech chips and link", () => {
    const many = ["2024-01", "2025-05", "2023-03", "2026-01"].map((d, i) => item({ id: `p${i}`, ...full, date: d, skills: ["React"], link: "https://x.dev" }));
    const out = buildFeatured(many);
    expect(out.map((x) => x.id)).toEqual(["p3", "p1", "p0"]);
    expect(out[0]).toMatchObject({ chips: ["React"], link: "https://x.dev" });
  });
  it("is empty when nothing is featured", () => expect(buildFeatured([item({})])).toEqual([]));
});
