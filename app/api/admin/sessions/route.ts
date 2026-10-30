import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { Session } from "@/models/Session";

/** Lists this owner's live sessions (devices). No tokens or hashes are ever returned. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  const now = new Date();
  const rows = await Session.find({ adminId: auth.admin._id, stage: "full", revoked: false, expiresAt: { $gt: now } })
    .sort({ lastSeen: -1 })
    .limit(50)
    .lean();
  return Response.json(
    {
      sessions: rows.map((s) => ({
        id: String(s._id),
        deviceLabel: s.deviceLabel,
        createdAt: s.createdAt,
        lastSeen: s.lastSeen,
        current: String(s._id) === String(auth.session._id),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
