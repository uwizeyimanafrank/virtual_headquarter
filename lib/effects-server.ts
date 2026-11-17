import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { HOME_TAG } from "@/lib/home";
import { DEFAULT_EFFECTS, normalizeEffects, type Effects } from "@/lib/effects";
import { Settings } from "@/models/Settings";

/** The owner's effect switches. With no database yet, everything stays on. Refreshed with the Home cache (invalidateHome). */
export async function getEffects(): Promise<Effects> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  try {
    await connectDb();
    const s = await Settings.findOne({ key: "main" }).select("effects").lean();
    return normalizeEffects((s as { effects?: unknown } | null)?.effects);
  } catch {
    return { ...DEFAULT_EFFECTS };
  }
}
