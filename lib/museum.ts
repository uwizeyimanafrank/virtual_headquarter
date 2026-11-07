import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { demoMuseum } from "@/lib/demo";
import { applySampleRules } from "@/lib/samples-data";
import { MuseumItem, type ItemType } from "@/models/MuseumItem";
import { Settings } from "@/models/Settings";

export const MUSEUM_TAG = "museum";

/** One item with every field both Museum layouts need (vertical timeline and horizontal track). */
export type MuseumItemData = {
  id: string;
  type: ItemType;
  title: string;
  date: string; // YYYY-MM
  description: string;
  mediaUrl: string;
  parallaxSpeed: number; // the desktop track floats each module by this amount
  skills: string[];
  link: string;
  howIEarnedIt: string;
  isSample: boolean;
};

export type MuseumChapterKey = "about" | "certificates" | "projects" | "library";

export type MuseumChapter = {
  key: MuseumChapterKey;
  title: string; // from settings, so the owner can rename a chapter without touching code
  items: MuseumItemData[]; // manual order first, then newest date — matches the Office list
};

export type MuseumData = { chapters: MuseumChapter[]; demo?: boolean };

// Which item types belong to each chapter, in walking order. Library joins books and references.
const CHAPTER_TYPES: Record<MuseumChapterKey, ItemType[]> = {
  about: ["story"],
  certificates: ["certificate"],
  projects: ["project"],
  library: ["book", "reference"],
};

const DEFAULT_TITLES: Record<MuseumChapterKey, string> = {
  about: "The Person Behind the Work",
  certificates: "Proof",
  projects: "The Execution",
  library: "Books and References",
};

// Shown if the database cannot be reached (for example while building without database access):
// the chapters still render, with their default names and no items.
function fallbackData(): MuseumData {
  return {
    chapters: (Object.keys(CHAPTER_TYPES) as MuseumChapterKey[]).map((key) => ({
      key,
      title: DEFAULT_TITLES[key],
      items: [],
    })),
  };
}

/**
 * Everything the Museum page needs: published items grouped into chapters, titles from settings.
 * Cached for a few minutes; the Office refreshes it right after you change content or settings
 * (see invalidateMuseum). Only plain data is returned (cached values must be serializable).
 */
export async function getMuseumData(): Promise<MuseumData> {
  "use cache";
  cacheTag(MUSEUM_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });

  try {
    await connectDb();
    const [s, published] = await Promise.all([
      Settings.findOne({ key: "main" }).lean(),
      MuseumItem.find({ status: "published" }).lean(),
    ]);
    const visible = applySampleRules(published, {
      showSamples: s?.showSamples ?? true,
      autoHide: s?.autoHideSamples ?? true,
    });

    // Brand-new database: nothing published and the Office never created the samples yet. Show the demo so the Museum is not empty.
    if (visible.length === 0 && (s?.showSamples ?? true) && !s?.onboarding?.samplesSeeded) {
      const d = demoMuseum();
      return { chapters: d.chapters.map((c) => ({ ...c, title: s?.chapterTitles?.[c.key] ?? c.title })) };
    }

    const data = fallbackData();
    for (const chapter of data.chapters) {
      chapter.title = s?.chapterTitles?.[chapter.key] ?? DEFAULT_TITLES[chapter.key];
      chapter.items = visible
        .filter((d) => CHAPTER_TYPES[chapter.key].includes(d.type as ItemType))
        // Same order the Office list uses: manual order first, then newest date.
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.date.localeCompare(a.date))
        .map((d) => ({
          id: String(d._id),
          type: d.type as ItemType,
          title: d.title,
          date: d.date,
          description: d.description ?? "",
          mediaUrl: d.mediaUrl ?? "",
          parallaxSpeed: d.parallaxSpeed ?? 0.5,
          skills: d.metadata?.skills ?? [],
          link: d.metadata?.gradeOrLink ?? "",
          howIEarnedIt: d.metadata?.howIEarnedIt ?? "",
          isSample: Boolean(d.isSample),
        }));
    }
    return data;
  } catch (err) {
    console.error("museum data unavailable, showing demo content:", err instanceof Error ? err.message : "unknown error");
    return demoMuseum();
  }
}

/** Call after the owner changes anything the Museum shows. Next visit is rebuilt fresh. */
export function invalidateMuseum() {
  revalidateTag(MUSEUM_TAG, { expire: 0 });
}
