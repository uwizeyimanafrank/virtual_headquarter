import { connection } from "next/server";
import { ENV_KEYS, hasEnv } from "@/lib/env";
import { pingDb } from "@/lib/db";
import { pingCloudinary } from "@/lib/cloudinary";

/**
 * Health check. Returns ONLY booleans, never values, URIs or error details.
 * connection() makes sure this runs at request time (not frozen at build time).
 */
export async function GET() {
  await connection();

  const envPresent: Record<string, boolean> = {};
  for (const key of ENV_KEYS) envPresent[key] = hasEnv(key);

  const [dbReachable, cloudinaryReachable] = await Promise.all([
    hasEnv("MONGODB_URI") ? pingDb() : Promise.resolve(false),
    hasEnv("CLOUDINARY_API_SECRET") ? pingCloudinary() : Promise.resolve(false),
  ]);

  return Response.json(
    { ok: true, envPresent, dbReachable, cloudinaryReachable },
    { headers: { "Cache-Control": "no-store" } },
  );
}
