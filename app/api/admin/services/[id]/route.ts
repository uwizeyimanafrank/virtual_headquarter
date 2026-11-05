import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { audit } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto-server";
import { credentialLabel } from "@/lib/services";
import { parseCredentials, serviceUpdate } from "@/lib/services/schema";
import { toServiceView } from "@/lib/services/view";
import { Service } from "@/models/Service";

const NO_STORE = { "Cache-Control": "no-store" };
const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

/** Change a service. The type cannot change. Changing or clearing credentials needs a fresh authenticator code. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/services/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  const body = await readJsonLimited(request, 10_000);
  if (!body.ok) return Response.json({ error: "Invalid request." }, { status: body.status, headers: NO_STORE });
  const parsed = serviceUpdate.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400, headers: NO_STORE });
  const v = parsed.data;

  await connectDb();
  const doc = await Service.findById(id);
  if (!doc) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });

  const $set: Record<string, unknown> = {};
  if (v.name !== undefined) $set.name = v.name;
  if (v.baseUrl !== undefined) $set.baseUrl = v.baseUrl;
  if (v.healthPath !== undefined) $set.healthPath = v.healthPath;
  if (v.enabled !== undefined) $set.enabled = v.enabled;
  if (v.limitMb !== undefined) $set.limitBytes = v.limitMb ? Math.round(v.limitMb * 1024 * 1024) : null;

  const changingCreds = Boolean(v.credentials && Object.keys(v.credentials).length > 0);
  if (changingCreds || v.clearCredentials) {
    const stale = requireFreshAuth(auth.session, 300);
    if (stale) return stale;
    if (v.clearCredentials) $set.credentialEnc = "";
    if (changingCreds) {
      const c = parseCredentials(doc.type, v.credentials);
      if (!c.success) return Response.json({ error: "Please check the credentials.", issues: c.error.issues.map((i) => ({ path: `credentials.${i.path.join(".")}`, message: i.message })) }, { status: 400, headers: NO_STORE });
      $set.credentialEnc = encryptSecret(JSON.stringify(c.data), credentialLabel(id));
    }
  }
  if (Object.keys($set).length === 0) return Response.json({ error: "Nothing to change." }, { status: 400, headers: NO_STORE });
  const updated = await Service.findByIdAndUpdate(id, { $set }, { returnDocument: "after", runValidators: true }).lean();
  await audit("service_change", true, request.headers, `edited ${doc.type}${changingCreds || v.clearCredentials ? " (credentials)" : ""}`);
  return Response.json({ service: toServiceView(updated!) }, { headers: NO_STORE });
}

/** Stop monitoring a service. Needs a fresh authenticator code. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/services/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  await connectDb();
  const d = await Service.findByIdAndDelete(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  await audit("delete", true, request.headers, `service ${d.type}`);
  return Response.json({ ok: true }, { headers: NO_STORE });
}
