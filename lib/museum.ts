import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { HOME_TAG } from "@/lib/home";
import { buildChapters, type Chapter, type ChapterTitles, type MuseumEntry } from "@/lib/museum-chapters";
import { applySampleRules } from "@/lib/samples-data";
import { MuseumItem } from "@/models/MuseumItem";
import { Settings } from "@/models/Settings";

export type MuseumData = { chapters: Chapter[]; profileName: string };

const DEFAULT_TITLES: ChapterTitles = { about: "The Person Behind the Work", certificates: "Proof", projects: "The Execution", library: "Books and References" };

/**
 * Everything the Museum shows, cached for a few minutes (same refresh tag as Home, so the Office
 * updates both at once). Falls back to an empty Museum if the database cannot be reached.
 */
export async function getMuseumData(): Promise<MuseumData> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });

  try {
    await connectDb();
    const [s, published] = await Promise.all([Settings.findOne({ key: "main" }).lean(), MuseumItem.find({ status: "published" }).lean()]);
    const visible = applySampleRules(published, { showSamples: s?.showSamples ?? true, autoHide: s?.autoHideSamples ?? true });
    const orders = new Map(visible.map((d) => [String(d._id), d.order ?? 0]));
    const entries: MuseumEntry[] = visible.map((d) => ({
      id: String(d._id),
      type: d.type,
      title: d.title,
      description: d.description ?? "",
      mediaUrl: d.mediaUrl ?? "",
      parallaxSpeed: d.parallaxSpeed ?? 0.5,
      date: d.date,
      skills: d.metadata?.skills ?? [],
      link: d.metadata?.gradeOrLink ?? "",
      howIEarnedIt: d.metadata?.howIEarnedIt ?? "",
    }));
    const titles: ChapterTitles = {
      about: s?.chapterTitles?.about ?? DEFAULT_TITLES.about,
      certificates: s?.chapterTitles?.certificates ?? DEFAULT_TITLES.certificates,
      projects: s?.chapterTitles?.projects ?? DEFAULT_TITLES.projects,
      library: s?.chapterTitles?.library ?? DEFAULT_TITLES.library,
    };
    return { chapters: buildChapters(entries, titles, (e) => orders.get(e.id) ?? 0), profileName: s?.profile?.name ?? "" };
  } catch (err) {
    console.error("museum data unavailable:", err instanceof Error ? err.message : "unknown error");
    return { chapters: [], profileName: "" };
  }
}
