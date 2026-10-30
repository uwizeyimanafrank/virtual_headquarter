/** Turns the flat list of published items into the Museum's chapters. Pure logic, easy to test. */
export type MuseumEntry = {
  id: string; type: string; title: string; description: string; mediaUrl: string;
  parallaxSpeed: number; date: string; skills: string[]; link: string; howIEarnedIt: string;
};

export type ChapterId = "about" | "certificates" | "projects" | "library";
export type Chapter = { id: ChapterId; title: string; entries: MuseumEntry[] };
export type ChapterTitles = Record<ChapterId, string>;

export const CHAPTER_ORDER: ChapterId[] = ["about", "certificates", "projects", "library"];
const CHAPTER_OF: Record<string, ChapterId> = { story: "about", certificate: "certificates", project: "projects", book: "library", reference: "library" };

/** Chapters with no entries are left out. Inside a chapter: your own order first, then newest first. */
export function buildChapters(entries: MuseumEntry[], titles: ChapterTitles, orderOf: (e: MuseumEntry) => number = () => 0): Chapter[] {
  return CHAPTER_ORDER.map((id) => ({
    id,
    title: titles[id],
    entries: entries
      .filter((e) => CHAPTER_OF[e.type] === id)
      .sort((a, b) => orderOf(a) - orderOf(b) || b.date.localeCompare(a.date)),
  })).filter((c) => c.entries.length > 0);
}
