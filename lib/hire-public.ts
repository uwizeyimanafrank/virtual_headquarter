import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { HIRE_DEFAULTS, availabilityBadge, resolveHire, type Badge, type HireContent } from "@/lib/hire";
import { getHomeData, HOME_TAG, type HomeItem } from "@/lib/home";
import { Settings } from "@/models/Settings";

export type HirePage = { content: HireContent; badge: Badge; name: string; cvUrl: string; items: HomeItem[]; demo: boolean };

/**
 * Everything /hire needs: the owner's text (defaults for any part not written yet), the CV link, and the projects the
 * owner picked as featured. The availability badge is worked out here (a "from" date flips to open within 5 minutes of the day starting). Cached 5 minutes and refreshed at once by Office changes (they call invalidateHome).
 */
export async function getHirePage(): Promise<HirePage> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  const home = await getHomeData(); // already cached; gives the profile and the published projects
  try {
    await connectDb();
    const s = await Settings.findOne({ key: "main" }).select("hire").lean();
    const content = resolveHire(s?.hire);
    return { content, badge: availabilityBadge(content.availability, new Date()), name: home.profile.name, cvUrl: home.profile.cvUrl ?? "", items: home.items, demo: false };
  } catch (err) {
    console.error("hire page: database unavailable, showing defaults:", err instanceof Error ? err.message : "unknown error");
    return { content: HIRE_DEFAULTS, badge: availabilityBadge(HIRE_DEFAULTS.availability, new Date()), name: home.profile.name, cvUrl: home.profile.cvUrl ?? "", items: home.items, demo: true };
  }
}
