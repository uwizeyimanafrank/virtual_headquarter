import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { audit } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto-server";
import { credentialLabel } from "@/lib/services";
import { MAX_SERVICES, parseCredentials, serviceCreate } from "@/lib/services/schema";
import { toServiceView } from "@/lib/services/view";
import { Service } from "@/models/Service";

const NO_STORE = { "Cache-Control": "no-store" };

/** All monitored services. Credentials are never included, only a "hasCredentials" flag. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  const docs = await Service.find({}).sort({ createdAt: 1 }).limit(MAX_SERVICES).lean();
  return Response.json({ services: docs.map(toServiceView) }, { headers: NO_STORE });
}

/** Add a service. Saving credentials needs a fresh authenticator code. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const body = await readJsonLimited(request, 10_000);
  if (!body.ok) return Response.json({ error: "Invalid request." }, { status: body.status, headers: NO_STORE });
  const parsed = serviceCreate.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400, headers: NO_STORE });
  const v = parsed.data;

  let creds: Record<string, string> | null = null;
  if (v.credentials && Object.keys(v.credentials).length > 0) {
    const c = parseCredentials(v.type, v.credentials);
    if (!c.success) return Response.json({ error: "Please check the credentials.", issues: c.error.issues.map((i) => ({ path: `credentials.${i.path.join(".")}`, message: i.message })) }, { status: 400, headers: NO_STORE });
    const stale = requireFreshAuth(auth.session, 300);
    if (stale) return stale;
    creds = c.data as Record<string, string>;
  }

  await connectDb();
  if ((await Service.countDocuments({})) >= MAX_SERVICES) return Response.json({ error: `You can monitor up to ${MAX_SERVICES} services.` }, { status: 400, headers: NO_STORE });
  const doc = new Service({
    name: v.name, type: v.type, baseUrl: v.baseUrl ?? "", healthPath: v.healthPath, enabled: v.enabled,
    limitBytes: v.limitMb ? Math.round(v.limitMb * 1024 * 1024) : null,
  });
  if (creds) doc.credentialEnc = encryptSecret(JSON.stringify(creds), credentialLabel(String(doc._id)));
  await doc.save();
  await audit("service_change", true, request.headers, `added ${v.type}`);
  return Response.json({ service: toServiceView(doc.toObject()) }, { status: 201, headers: NO_STORE });
}
