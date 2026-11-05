import { z } from "zod";
import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { decryptCredentials, runCheck } from "@/lib/services";
import { recordCheck } from "@/lib/services/alerts";
import { toServiceView } from "@/lib/services/view";
import { Service } from "@/models/Service";

const STALE_MS = 5 * 60_000; // results younger than this are reused, so the dashboard does not hammer the services
const MIN_GAP_MS = 30_000; // even "refresh now" waits at least this long between checks of the same service
const body = z.object({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(30).optional(), force: z.boolean().optional() });
const NO_STORE = { "Cache-Control": "no-store" };

/** Checks the services that are due (or all of them with force) and returns the fresh list. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const raw = await readJsonLimited(request, 5_000);
  const parsed = raw.ok ? body.safeParse(raw.data ?? {}) : null;
  if (!parsed?.success) return Response.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  const { ids, force } = parsed.data;

  await connectDb();
  const docs = await Service.find({ enabled: true, ...(ids ? { _id: { $in: ids } } : {}) }).limit(30);
  const now = Date.now();
  const due = docs.filter((d) => {
    const age = d.lastCheck?.at ? now - new Date(d.lastCheck.at).getTime() : Infinity;
    return force ? age > MIN_GAP_MS : age > STALE_MS;
  });

  await Promise.allSettled(
    due.map(async (d) => {
      const result = await runCheck({ id: String(d._id), type: d.type, baseUrl: d.baseUrl ?? "", healthPath: d.healthPath ?? "/", credentials: decryptCredentials(String(d._id), d.credentialEnc ?? ""), limitBytes: d.limitBytes ?? null });
      await recordCheck(d._id, d.name, d.lastCheck?.status, result, request.headers);
    }),
  );

  const all = await Service.find({}).sort({ createdAt: 1 }).limit(30).lean();
  return Response.json({ services: all.map(toServiceView), checked: due.length }, { headers: NO_STORE });
}
