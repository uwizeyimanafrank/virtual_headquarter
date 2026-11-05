import "server-only";
import { connectDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { CheckResult } from "@/lib/services/types";
import { Service } from "@/models/Service";

/** Saves a check result and writes an audit entry when a service goes down or comes back. */
export async function recordCheck(id: unknown, name: string, previous: string | null | undefined, result: CheckResult, headers: Headers) {
  await connectDb();
  await Service.updateOne({ _id: id }, { $set: { lastCheck: { at: new Date(), status: result.status, message: result.message.slice(0, 200), metrics: result.metrics } } });
  if (previous !== "down" && result.status === "down") await audit("service_down", false, headers, name);
  else if (previous === "down" && result.status !== "down") await audit("service_up", true, headers, name);
}

/** Enabled services whose last check said "down" (for the banner shown on every Office page). */
export async function downServices(): Promise<{ id: string; name: string }[]> {
  await connectDb();
  const rows = await Service.find({ enabled: true, "lastCheck.status": "down" }).select("name").limit(10).lean();
  return rows.map((r) => ({ id: String(r._id), name: r.name }));
}
