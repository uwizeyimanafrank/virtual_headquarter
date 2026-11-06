import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { readJsonLimited } from "@/lib/body";
import { audit } from "@/lib/audit";
import { MAX_VAULT_ENTRIES, MAX_VAULT_PAYLOAD_CHARS, parseVaultPayload } from "@/lib/vault-payload";
import { VaultEntry } from "@/models/VaultEntry";

const NO_STORE = { "Cache-Control": "no-store" };

/** Open the vault: returns the encrypted entries (still ciphertext). Needs a fresh authenticator code and is audited. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  await connectDb();
  const docs = await VaultEntry.find({}).sort({ createdAt: 1 }).limit(MAX_VAULT_ENTRIES).lean();
  await audit("vault_open", true, request.headers, `${docs.length} entries`);
  return Response.json(
    { entries: docs.map((d) => ({ id: String(d._id), payload: d.payload, createdAt: d.createdAt })), max: MAX_VAULT_ENTRIES },
    { headers: NO_STORE },
  );
}

/** Save one encrypted entry. The browser already encrypted it; we only check its shape and size. */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const stale = requireFreshAuth(auth.session, 300);
  if (stale) return stale;
  const body = await readJsonLimited(request, MAX_VAULT_PAYLOAD_CHARS + 2_000);
  if (!body.ok) return Response.json({ error: "Invalid request." }, { status: body.status, headers: NO_STORE });
  const raw = (body.data as { payload?: unknown } | null)?.payload;
  const parsed = parseVaultPayload(raw);
  if (!parsed.ok) return Response.json({ error: "That is not an encrypted vault entry." }, { status: 400, headers: NO_STORE });
  await connectDb();
  if ((await VaultEntry.countDocuments({})) >= MAX_VAULT_ENTRIES) {
    return Response.json({ error: `The vault holds up to ${MAX_VAULT_ENTRIES} entries.` }, { status: 400, headers: NO_STORE });
  }
  const doc = await VaultEntry.create({ payload: parsed.payload });
  await audit("vault_change", true, request.headers, "entry added"); // never log payloads
  return Response.json({ id: String(doc._id) }, { status: 201, headers: NO_STORE });
}
