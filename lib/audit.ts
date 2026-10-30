import "server-only";
import { connectDb } from "@/lib/db";
import { ipHash } from "@/lib/request";
import { deviceLabel } from "@/lib/device";
import { AuditLog, type AUDIT_EVENTS } from "@/models/AuditLog";

/** Writes one audit entry. Never throws, so auditing can't break a request. Never put secrets in `detail`. */
export async function audit(event: (typeof AUDIT_EVENTS)[number], ok: boolean, headers: Headers, detail = "") {
  try {
    await connectDb();
    await AuditLog.create({ event, ok, ipHash: ipHash(headers), deviceLabel: deviceLabel(headers), detail: detail.slice(0, 200) });
  } catch (err) {
    console.error("audit write failed:", err instanceof Error ? err.message : "unknown");
  }
}
