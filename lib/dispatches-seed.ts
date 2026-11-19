import "server-only";
import { getSettings } from "@/lib/settings";
import { SAMPLE_DISPATCHES } from "@/lib/dispatches-samples";
import { Dispatch } from "@/models/Dispatch";
import { Settings } from "@/models/Settings";

/**
 * Creates the three sample dispatches ONCE, and only when no dispatch exists at all.
 * The flag means deleting them is never undone behind the owner's back.
 */
export async function ensureDispatchSamples(): Promise<boolean> {
  const settings = await getSettings();
  if (settings?.onboarding?.dispatchSamplesSeeded) return false;
  const any = await Dispatch.countDocuments({});
  await Settings.updateOne({ key: "main" }, { $set: { "onboarding.dispatchSamplesSeeded": true } });
  if (any > 0) return false;
  const now = new Date();
  await Dispatch.insertMany(SAMPLE_DISPATCHES.map((s, i) => ({ ...s, date: new Date(now.getTime() - i * 86400000), published: true, isSample: true })));
  return true;
}
