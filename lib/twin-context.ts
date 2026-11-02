import "server-only";
import { cloudinaryClient } from "@/lib/cloudinary";
import { connectDb } from "@/lib/db";
import { hasEnv } from "@/lib/env";
import { buildTwinContext, type TwinContext } from "@/lib/twin-context-core";
import { AuditLog } from "@/models/AuditLog";
import { Message } from "@/models/Message";
import { MuseumItem } from "@/models/MuseumItem";

/** Gathers the safe numbers for the AI Twin. Every lookup is optional: a failing one becomes "unknown", never an error. */
export async function collectTwinContext(): Promise<TwinContext> {
  const conn = await connectDb();

  const [rows, samples, unread, lastLogin, dbStats, mediaBytes] = await Promise.all([
    MuseumItem.aggregate<{ _id: { type: string; status: string }; n: number }>([{ $group: { _id: { type: "$type", status: "$status" }, n: { $sum: 1 } } }]).catch(() => []),
    MuseumItem.countDocuments({ isSample: true }).catch(() => 0),
    Message.countDocuments({ read: false, archived: false }).catch(() => 0),
    AuditLog.findOne({ event: "login_2fa", ok: true }).sort({ createdAt: -1 }).select("createdAt").lean().catch(() => null),
    conn.connection.db?.stats().catch(() => null) ?? Promise.resolve(null),
    cloudinaryStorage(),
  ]);

  const byType: Record<string, { published: number; draft: number }> = {};
  for (const r of rows) {
    const t = (byType[r._id.type] ??= { published: 0, draft: 0 });
    if (r._id.status === "published") t.published += r.n;
    else t.draft += r.n;
  }
  return buildTwinContext({
    items: { byType, samples },
    messages: { unread },
    database: { dataBytes: dbStats?.dataSize, storageBytes: dbStats?.storageSize },
    media: { configured: hasEnv("CLOUDINARY_API_SECRET"), storageBytes: mediaBytes },
    lastLoginAt: lastLogin?.createdAt,
  });
}

/** Used Cloudinary storage in bytes, or null if unknown. Gives up after 4 seconds so the chat never waits long. */
async function cloudinaryStorage(): Promise<number | null> {
  if (!hasEnv("CLOUDINARY_CLOUD_NAME") || !hasEnv("CLOUDINARY_API_KEY") || !hasEnv("CLOUDINARY_API_SECRET")) return null;
  try {
    const usage = await Promise.race([
      cloudinaryClient().api.usage() as Promise<{ storage?: { usage?: number } }>,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
    ]);
    return typeof usage.storage?.usage === "number" ? usage.storage.usage : null;
  } catch {
    return null;
  }
}
