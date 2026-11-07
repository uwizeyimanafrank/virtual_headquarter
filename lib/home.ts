import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { demoHome } from "@/lib/demo";
import { applySampleRules } from "@/lib/samples-data";
import { MuseumItem } from "@/models/MuseumItem";
import { Settings } from "@/models/Settings";

export const HOME_TAG = "home";

export type HomeItem = { id: string; type: string; title: string; date: string; description: string; mediaUrl: string; skills: string[]; link: string };
export type HomeData = {
  heroTitle: string;
  heroText: string;
  chapterTitles: { about: string; certificates: string; projects: string; library: string };
  profile: { name: string; tagline: string; bio: string; photoUrl: string };
  items: HomeItem[];
  demo?: boolean; // true when this is built-in demo content (database not connected yet)
};

// Shown if the database cannot be reached (for example while building without database access).
const FALLBACK: HomeData = {
  heroTitle: "Discipline over luck.",
  heroText: "Vision sets the direction. Execution decides the result. Take the tour and judge the work yourself.",
  chapterTitles: { about: "The Person Behind the Work", certificates: "Proof", projects: "The Execution", library: "Books and References" },
  profile: { name: "", tagline: "", bio: "", photoUrl: "" },
  items: [],
};

/**
 * Everything the Home page needs, read once and cached for a few minutes.
 * The Office refreshes it immediately after you change settings or content (see invalidateHome).
 * Only plain data is returned (cached values must be serializable).
 */
export async function getHomeData(): Promise<HomeData> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });

  try {
    await connectDb();
    const [s, published] = await Promise.all([
      Settings.findOne({ key: "main" }).lean(),
      MuseumItem.find({ status: "published" }).lean(),
    ]);
    const visible = applySampleRules(published, { showSamples: s?.showSamples ?? true, autoHide: s?.autoHideSamples ?? true });
    // Brand-new database: nothing published and the Office never created the samples yet. Show the demo so the site is not empty.
    if (visible.length === 0 && (s?.showSamples ?? true) && !s?.onboarding?.samplesSeeded) {
      const d = demoHome();
      const pf = s?.profile;
      return {
        ...d,
        demo: false,
        heroTitle: s?.heroTitle ?? d.heroTitle,
        heroText: s?.heroText ?? d.heroText,
        profile: { name: pf?.name || d.profile.name, tagline: pf?.tagline || d.profile.tagline, bio: pf?.bio || d.profile.bio, photoUrl: pf?.photoUrl || d.profile.photoUrl },
      };
    }
    return {
      heroTitle: s?.heroTitle ?? FALLBACK.heroTitle,
      heroText: s?.heroText ?? FALLBACK.heroText,
      chapterTitles: {
        about: s?.chapterTitles?.about ?? FALLBACK.chapterTitles.about,
        certificates: s?.chapterTitles?.certificates ?? FALLBACK.chapterTitles.certificates,
        projects: s?.chapterTitles?.projects ?? FALLBACK.chapterTitles.projects,
        library: s?.chapterTitles?.library ?? FALLBACK.chapterTitles.library,
      },
      profile: { name: s?.profile?.name ?? "", tagline: s?.profile?.tagline ?? "", bio: s?.profile?.bio ?? "", photoUrl: s?.profile?.photoUrl ?? "" },
      items: visible
        .map((d) => ({
          id: String(d._id),
          type: d.type,
          title: d.title,
          date: d.date,
          description: (d.description ?? "").slice(0, 280),
          mediaUrl: d.mediaUrl ?? "",
          skills: d.metadata?.skills ?? [],
          link: d.metadata?.gradeOrLink ?? "",
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  } catch (err) {
    console.error("home data unavailable, showing demo content:", err instanceof Error ? err.message : "unknown error");
    return demoHome();
  }
}

/** Call after the owner changes anything the public site shows. Next visit is rebuilt fresh. */
export function invalidateHome() {
  revalidateTag(HOME_TAG, { expire: 0 });
}
