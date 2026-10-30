import { describe, expect, it } from "vitest";
import { buildChapters, type ChapterTitles, type MuseumEntry } from "@/lib/museum-chapters";

const titles: ChapterTitles = { about: "About", certificates: "Proof", projects: "Work", library: "Library" };
const e = (id: string, type: string, date: string): MuseumEntry => ({ id, type, title: id, description: "", mediaUrl: "", parallaxSpeed: 0.5, date, skills: [], link: "", howIEarnedIt: "" });

describe("buildChapters", () => {
  it("groups items into chapters in the fixed story order", () => {
    const chapters = buildChapters([e("p", "project", "2026-01"), e("s", "story", "2024-01"), e("c", "certificate", "2025-01"), e("b", "book", "2026-02")], titles);
    expect(chapters.map((c) => c.id)).toEqual(["about", "certificates", "projects", "library"]);
    expect(chapters.map((c) => c.title)).toEqual(["About", "Proof", "Work", "Library"]);
  });
  it("puts books and references together", () => {
    const chapters = buildChapters([e("b", "book", "2026-01"), e("r", "reference", "2025-01")], titles);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].entries.map((x) => x.id)).toEqual(["b", "r"]);
  });
  it("leaves out empty chapters", () => {
    expect(buildChapters([e("p", "project", "2026-01")], titles).map((c) => c.id)).toEqual(["projects"]);
    expect(buildChapters([], titles)).toEqual([]);
  });
  it("sorts by your own order first, then newest first", () => {
    const orders: Record<string, number> = { a: 1, b: 0, c: 0 };
    const chapters = buildChapters([e("a", "project", "2026-09"), e("b", "project", "2026-01"), e("c", "project", "2026-05")], titles, (x) => orders[x.id]);
    expect(chapters[0].entries.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("ignores unknown types instead of crashing", () => {
    expect(buildChapters([e("x", "mystery", "2026-01")], titles)).toEqual([]);
  });
});
