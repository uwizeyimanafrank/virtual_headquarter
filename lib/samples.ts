import "server-only";
import { connectDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { SAMPLE_ITEMS, SAMPLE_PROFILE, applySampleRules } from "@/lib/samples-data";
import { MuseumItem } from "@/models/MuseumItem";
import { Settings } from "@/models/Settings";

/**
 * Creates the sample content ONCE (safe to call many times).
 * It only runs by itself when no real item exists yet and it was never created before,
 * so deleting the samples is never undone behind your back. `force` is for the "Restore samples" button.
 */
export async function ensureSamples(force = false): Promise<boolean> {
  const settings = await getSettings();
  if (!force && settings?.onboarding?.samplesSeeded) return false;

  if (!force) {
    const real = await MuseumItem.countDocuments({ isSample: { $ne: true } });
    if (real > 0) {
      await Settings.updateOne({ key: "main" }, { $set: { "onboarding.samplesSeeded": true } });
      return false;
    }
  }

  // Idempotent: one document per sample title.
  await MuseumItem.bulkWrite(
    SAMPLE_ITEMS.map((s) => ({
      updateOne: {
        filter: { isSample: true, title: s.title },
        update: { $setOnInsert: { ...s, status: "published", isSample: true } },
        upsert: true,
      },
    })),
  );

  // Fill only EMPTY profile fields so real text is never overwritten.
  const p = settings?.profile ?? { name: "", tagline: "", bio: "", photoUrl: "" };
  const $set: Record<string, unknown> = { "onboarding.samplesSeeded": true };
  let filled = false;
  for (const k of ["name", "tagline", "bio", "photoUrl"] as const) {
    if (!p[k]) { $set[`profile.${k}`] = SAMPLE_PROFILE[k]; filled = true; }
  }
  if (filled) $set["onboarding.profileIsSample"] = true;
  await Settings.updateOne({ key: "main" }, { $set });
  return true;
}

/** Removes every sample item and any sample profile text. Returns how many items were removed. */
export async function deleteSamples(): Promise<number> {
  await connectDb();
  const r = await MuseumItem.deleteMany({ isSample: true });
  const settings = await getSettings();
  if (settings?.onboarding?.profileIsSample) {
    const $set: Record<string, unknown> = { "onboarding.profileIsSample": false };
    for (const k of ["name", "tagline", "bio", "photoUrl"] as const) {
      if (settings.profile?.[k] === SAMPLE_PROFILE[k]) $set[`profile.${k}`] = "";
    }
    await Settings.updateOne({ key: "main" }, { $set });
  }
  return r.deletedCount;
}

/** Numbers for the dashboard banner. */
export async function sampleStatus() {
  await connectDb();
  const settings = await getSettings();
  const published = await MuseumItem.find({ status: "published" }).select("type isSample").lean();
  const total = await MuseumItem.countDocuments({ isSample: true });
  const visible = applySampleRules(published, {
    showSamples: settings?.showSamples ?? true,
    autoHide: settings?.autoHideSamples ?? true,
  }).filter((i) => i.isSample).length;
  return {
    total,
    visiblePublicly: visible,
    showSamples: settings?.showSamples ?? true,
    autoHideSamples: settings?.autoHideSamples ?? true,
  };
}
