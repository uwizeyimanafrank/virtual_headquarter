import type { HomeData } from "@/lib/home";
import type { MuseumChapter, MuseumChapterKey, MuseumData } from "@/lib/museum";
import { resolveBlocks, visibleBlocks } from "@/lib/home-blocks";
import { SAMPLE_ITEMS, SAMPLE_PROFILE } from "@/lib/samples-data";

/**
 * Demo content: shown when the database cannot be reached, or on a brand-new database before the
 * first Office visit creates the real samples. It is the same sample content the Office creates,
 * so the site looks finished from the very first run, and every item is marked as sample.
 */
const CHAPTERS: { key: MuseumChapterKey; types: string[]; title: string }[] = [
  { key: "about", types: ["story"], title: "The Person Behind the Work" },
  { key: "certificates", types: ["certificate"], title: "Proof" },
  { key: "projects", types: ["project"], title: "The Execution" },
  { key: "library", types: ["book", "reference"], title: "Books and References" },
];

type SampleMeta = { skills?: readonly string[]; gradeOrLink?: string; howIEarnedIt?: string };
const meta = (s: (typeof SAMPLE_ITEMS)[number]) => (s as unknown as { metadata?: SampleMeta }).metadata ?? {};

export function demoHome(): HomeData {
  return {
    heroTitle: "Discipline over luck.",
    heroText: "Vision sets the direction. Execution decides the result. Take the tour and judge the work yourself.",
    chapterTitles: { about: CHAPTERS[0].title, certificates: CHAPTERS[1].title, projects: CHAPTERS[2].title, library: CHAPTERS[3].title },
    profile: { ...SAMPLE_PROFILE },
    items: SAMPLE_ITEMS.map((s, i) => ({
      id: `demo-${i}`, type: s.type, title: s.title, date: s.date, description: s.description.slice(0, 280),
      mediaUrl: s.mediaUrl, skills: [...(meta(s).skills ?? [])], link: meta(s).gradeOrLink ?? "",
    })).sort((a, b) => b.date.localeCompare(a.date)),
    blocks: visibleBlocks(resolveBlocks([])),
    demo: true,
  };
}

export function demoMuseum(): MuseumData {
  const chapters: MuseumChapter[] = CHAPTERS.map((c) => ({
    key: c.key,
    title: c.title,
    items: SAMPLE_ITEMS.filter((s) => c.types.includes(s.type))
      .map((s, i) => ({
        id: `demo-${c.key}-${i}`, type: s.type as MuseumChapter["items"][number]["type"], title: s.title, date: s.date,
        description: s.description, mediaUrl: s.mediaUrl, parallaxSpeed: s.parallaxSpeed, skills: [...(meta(s).skills ?? [])],
        link: meta(s).gradeOrLink ?? "", howIEarnedIt: meta(s).howIEarnedIt ?? "", isSample: true,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  }));
  return { chapters, demo: true };
}
