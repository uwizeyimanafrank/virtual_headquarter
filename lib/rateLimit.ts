import "server-only";
import { connectDb } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";

/**
 * Fixed-window rate limit stored in MongoDB (works on serverless hosts, no in-memory state).
 * Example: rateLimit("connect:abc", 5, 3600) allows 5 calls per hour per key.
 */
export async function rateLimit(key: string, max: number, windowSec: number) {
  await connectDb();
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const bucket = Math.floor(now / windowMs);
  const bucketKey = `${key}:${bucket}`;
  const expiresAt = new Date((bucket + 1) * windowMs + 60_000);

  const run = () =>
    RateLimit.findOneAndUpdate(
      { key: bucketKey },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" },
    ).lean();

  let doc;
  try {
    doc = await run();
  } catch (err) {
    // Two requests created the counter at the same moment: retry once.
    if ((err as { code?: number }).code === 11000) doc = await run();
    else throw err;
  }
  const count = doc?.count ?? 1;
  return { ok: count <= max, remaining: Math.max(0, max - count), retryAfterSec: Math.ceil(((bucket + 1) * windowMs - now) / 1000) };
}
