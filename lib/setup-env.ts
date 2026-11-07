import { randomBytes } from "node:crypto";

// Pure helpers for the local Setup screen: check what the person typed, and merge it into a .env.local text
// without losing anything that is already there.

export type SetupInput = {
  mongoUri?: string;
  cloudName?: string;
  cloudApiKey?: string;
  cloudApiSecret?: string;
  geminiKey?: string;
  officeSlug?: string;
  officePassword?: string;
  appUrl?: string;
};

export const SLUG_RE = /^[a-z0-9-]{8,64}$/;
export const MIN_PASSWORD_CHARS = 12;

export const randomB64 = (bytes = 32) => randomBytes(bytes).toString("base64");
export const randomSlug = () => randomBytes(9).toString("hex");

export function validateSetup(i: SetupInput): string[] {
  const errors: string[] = [];
  const t = (v: string | undefined) => (v ?? "").trim();
  if (t(i.mongoUri) && !/^mongodb(\+srv)?:\/\/\S+$/.test(t(i.mongoUri))) errors.push("The database link must start with mongodb:// or mongodb+srv:// and have no spaces.");
  const cloud = [t(i.cloudName), t(i.cloudApiKey), t(i.cloudApiSecret)];
  if (cloud.some(Boolean) && !cloud.every(Boolean)) errors.push("For images, fill all three Cloudinary boxes (or leave all three empty).");
  if (t(i.officeSlug) && !SLUG_RE.test(t(i.officeSlug))) errors.push("The Office address must be 8 to 64 characters: small letters, numbers and hyphens.");
  if (t(i.officePassword) && (i.officePassword ?? "").length < MIN_PASSWORD_CHARS) errors.push(`The Office password needs at least ${MIN_PASSWORD_CHARS} characters.`);
  if (t(i.appUrl) && !/^https?:\/\/\S+$/.test(t(i.appUrl))) errors.push("The app address must start with http:// or https://.");
  // Keys and links never contain spaces or quote marks. Refusing them keeps the .env file exact (the env loader cannot read every quoting style).
  for (const [k, v] of Object.entries(i)) if (k !== "officePassword" && /[\s"'`]/.test(v ?? "")) errors.push(`The ${k} value must not contain spaces, line breaks or quote marks. Copy it again without them.`);
  return errors;
}

/** How a value is written on a line of the .env file. `$` is escaped because the env loader expands $NAME. */
export function formatValue(v: string): string {
  const escaped = v.replace(/\$/g, "\\$");
  return /[\s#"'`]/.test(escaped) ? `"${escaped.replace(/"/g, '\\"')}"` : escaped;
}

/** Reads the KEYs that already have a non-empty value in an env file text. */
export function presentKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(\S.*)$/.exec(line);
    if (m && m[2].trim() !== "" && m[2].trim() !== '""') keys.add(m[1]);
  }
  return keys;
}

/** Replaces the lines of the given keys (or adds them at the end). Every other line, comment and blank stays as is. */
export function mergeEnv(existing: string, updates: Record<string, string>): string {
  const remaining = new Map(Object.entries(updates));
  const lines = existing === "" ? [] : existing.replace(/\s+$/, "").split(/\r?\n/);
  const out = lines.map((line) => {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=/.exec(line);
    if (m && remaining.has(m[1])) { const v = remaining.get(m[1]) as string; remaining.delete(m[1]); return `${m[1]}=${formatValue(v)}`; }
    return line;
  });
  if (remaining.size > 0) {
    if (out.length > 0) out.push("");
    out.push("# Added by the VHQ setup screen");
    for (const [k, v] of remaining) out.push(`${k}=${formatValue(v)}`);
  }
  return out.join("\n") + "\n";
}

/**
 * What to write. Secrets that must never change once they exist (they encrypt your 2FA secret) are only
 * created when missing, and empty boxes never erase a value that is already saved.
 */
export function buildUpdates(i: SetupInput, existing: string, hashed: string | null): Record<string, string> {
  const have = presentKeys(existing);
  const t = (v: string | undefined) => (v ?? "").trim();
  const u: Record<string, string> = {};
  if (t(i.mongoUri)) u.MONGODB_URI = t(i.mongoUri);
  if (t(i.cloudName)) { u.CLOUDINARY_CLOUD_NAME = t(i.cloudName); u.CLOUDINARY_API_KEY = t(i.cloudApiKey); u.CLOUDINARY_API_SECRET = t(i.cloudApiSecret); }
  if (t(i.geminiKey)) u.GEMINI_API_KEY = t(i.geminiKey);
  if (t(i.officeSlug)) u.ADMIN_ROUTE_SLUG = t(i.officeSlug);
  else if (!have.has("ADMIN_ROUTE_SLUG")) u.ADMIN_ROUTE_SLUG = randomSlug();
  if (hashed) u.ADMIN_BOOTSTRAP_HASH = hashed;
  if (!have.has("SESSION_SECRET")) u.SESSION_SECRET = randomB64();
  if (!have.has("SERVICE_CRED_KEY")) u.SERVICE_CRED_KEY = randomB64();
  if (t(i.appUrl)) u.APP_URL = t(i.appUrl).replace(/\/+$/, "");
  else if (!have.has("APP_URL")) u.APP_URL = "http://localhost:3000";
  return u;
}
