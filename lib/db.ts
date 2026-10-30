import "server-only";
import mongoose from "mongoose";
import { requireEnv } from "@/lib/env";

/**
 * One cached Mongoose connection per server process.
 * Stored on globalThis so hot reload (dev) and serverless hosts reuse it
 * instead of opening a new pool every time.
 */
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __vhqMongo?: Cache };
const cache: Cache = (g.__vhqMongo ??= { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const uri = requireEnv("MONGODB_URI"); // throws a readable error if missing
    cache.promise = mongoose.connect(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false,
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null; // allow a retry on the next request
    throw err;
  }
  return cache.conn;
}

/** Light ping used by /api/health. Returns false instead of throwing. */
export async function pingDb(): Promise<boolean> {
  try {
    const m = await connectDb();
    await m.connection.db?.admin().ping();
    return true;
  } catch {
    return false;
  }
}
