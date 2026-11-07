import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hash } from "@node-rs/argon2";
import { codeMatches, isLoopbackHost, setupAllowedFor } from "@/lib/setup-guard";
import { testCloudinary, testMongo } from "@/lib/doctor";
import { readJsonLimited } from "@/lib/body";
import { buildUpdates, mergeEnv, presentKeys, randomSlug, validateSetup, type SetupInput } from "@/lib/setup-env";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const ENV_PATH = () => path.resolve(process.cwd(), ".env.local");

let failures = 0;
let lockedUntil = 0;

async function readEnvFile(): Promise<string> {
  try { return await readFile(ENV_PATH(), "utf8"); } catch { return ""; }
}

/** Local-only. In production this route answers 404, so it cannot be found or used on a real host. */
function gate(request: Request): Response | null {
  if (!setupAllowedFor(request.headers.get("host"))) return json({ error: "Not found." }, 404);
  const origin = request.headers.get("origin");
  if (origin) {
    let host = "";
    try { host = new URL(origin).host; } catch { /* rejected below */ }
    if (!isLoopbackHost(host) || host !== request.headers.get("host")) return json({ error: "Not allowed." }, 403);
  }
  return null;
}

/** Tells the page what is already saved (names only, never values). */
export async function GET(request: Request) {
  const blocked = gate(request);
  if (blocked) return blocked;
  const have = presentKeys(await readEnvFile());
  return json({
    saved: {
      database: have.has("MONGODB_URI"),
      images: have.has("CLOUDINARY_CLOUD_NAME") && have.has("CLOUDINARY_API_KEY") && have.has("CLOUDINARY_API_SECRET"),
      ai: have.has("GEMINI_API_KEY"),
      office: have.has("ADMIN_ROUTE_SLUG"),
    },
    suggestedSlug: randomSlug(),
  });
}

export async function POST(request: Request) {
  const blocked = gate(request);
  if (blocked) return blocked;
  if (Date.now() < lockedUntil) return json({ error: "Too many wrong codes. Wait a minute and try again." }, 429);
  const body = await readJsonLimited(request, 20_000);
  if (!body.ok) return json({ error: "Invalid request." }, body.status);
  const b = body.data as { code?: unknown; action?: unknown; values?: SetupInput } | null;
  if (!codeMatches(b?.code)) {
    if (++failures >= 8) { failures = 0; lockedUntil = Date.now() + 60_000; }
    return json({ error: "That setup code is not right. Look at the terminal where you started the app." }, 403);
  }
  failures = 0;
  const v = b?.values ?? {};
  const t = (x: string | undefined) => (x ?? "").trim();

  switch (b?.action) {
    case "check-code":
      return json({ ok: true });
    case "test-mongo":
      return json(await testMongo(t(v.mongoUri)));
    case "test-cloudinary":
      return json(await testCloudinary({ cloudName: t(v.cloudName), apiKey: t(v.cloudApiKey), apiSecret: t(v.cloudApiSecret) }));
    case "save": {
      const errors = validateSetup(v);
      if (errors.length) return json({ error: errors[0], errors }, 400);
      const existing = await readEnvFile();
      const hashed = t(v.officePassword)
        ? "b64:" + Buffer.from(await hash(v.officePassword as string, { memoryCost: 19456, timeCost: 2, parallelism: 1 })).toString("base64")
        : null;
      const updates = buildUpdates(v, existing, hashed);
      await writeFile(ENV_PATH(), mergeEnv(existing, updates), { encoding: "utf8", mode: 0o600 });
      return json({ ok: true, written: Object.keys(updates), slug: updates.ADMIN_ROUTE_SLUG ?? null });
    }
    default:
      return json({ error: "Unknown action." }, 400);
  }
}
