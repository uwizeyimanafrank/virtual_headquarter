import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { AuditLog } from "@/models/AuditLog";

/** Latest security events (logins, failures, panic...). */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  const rows = await AuditLog.find({}).sort({ createdAt: -1 }).limit(50).lean();
  return Response.json(
    { events: rows.map((r) => ({ id: String(r._id), event: r.event, ok: r.ok, deviceLabel: r.deviceLabel, detail: r.detail, createdAt: r.createdAt })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
