import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { VaultEntry } from "@/models/VaultEntry";

const NO_STORE = { "Cache-Control": "no-store" };
const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

/** Delete one vault entry. Needs a fresh authenticator code. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/vault/[id]">) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const { id } = await ctx.params;
  if (!isId(id)) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  await connectDb();
  const d = await VaultEntry.findByIdAndDelete(id).lean();
  if (!d) return Response.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  await audit("delete", true, request.headers, "vault entry");
  return Response.json({ ok: true }, { headers: NO_STORE });
}
