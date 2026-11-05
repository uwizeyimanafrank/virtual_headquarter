import "server-only";
import mongoose from "mongoose";
import { connectDb, pingDb } from "@/lib/db";
import { M0_STORAGE_LIMIT_BYTES, type Adapter, type CheckResult, type Metric } from "@/lib/services/types";

type Stats = { dataSize?: number; storageSize?: number; collections?: number };

function toMetrics(stats: Stats | null, limit: number): Metric[] {
  const out: Metric[] = [];
  const size = stats?.storageSize ?? stats?.dataSize;
  if (typeof size === "number") out.push({ key: "storage", label: "Storage used", value: size, unit: "bytes", limit });
  if (typeof stats?.collections === "number") out.push({ key: "collections", label: "Collections", value: stats.collections, unit: "count" });
  return out;
}

/** With no stored credentials it watches THIS app's database. With a stored address it watches another MongoDB. */
export const mongodbAdapter: Adapter = {
  async check(s): Promise<CheckResult> {
    const limit = s.limitBytes ?? M0_STORAGE_LIMIT_BYTES;
    const uri = s.credentials?.uri;
    if (!uri) {
      if (!(await pingDb())) return { status: "down", message: "Could not reach the database.", metrics: [] };
      const conn = await connectDb();
      const stats = (await conn.connection.db?.stats().catch(() => null)) as Stats | null;
      return finish(toMetrics(stats, limit), limit);
    }
    const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, maxPoolSize: 1, bufferCommands: false });
    try {
      await conn.asPromise();
      await conn.db?.admin().ping();
      const stats = (await conn.db?.stats().catch(() => null)) as Stats | null;
      return finish(toMetrics(stats, limit), limit);
    } catch {
      return { status: "down", message: "Could not connect with the stored address.", metrics: [] };
    } finally {
      await conn.close().catch(() => {});
    }
  },
};

function finish(metrics: Metric[], limit: number): CheckResult {
  const used = metrics.find((m) => m.key === "storage")?.value ?? null;
  if (used !== null && used >= limit * 0.9) return { status: "degraded", message: "Storage is over 90% of its limit.", metrics };
  return { status: "up", message: "Connected.", metrics };
}
