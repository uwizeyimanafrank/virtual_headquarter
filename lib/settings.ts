import "server-only";
import { connectDb } from "@/lib/db";
import { Settings } from "@/models/Settings";

/** Returns the single settings document, creating it with defaults on first use. */
export async function getSettings() {
  await connectDb();
  return Settings.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
}
