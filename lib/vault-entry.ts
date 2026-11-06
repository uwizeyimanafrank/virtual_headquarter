import { decryptText, encryptText, VaultCryptoError } from "@/lib/vault-crypto";

// What goes INSIDE the encryption. The server only ever sees the encrypted string, so the label
// and project name are secret too. All of this runs in the browser.
export const MAX_LABEL_CHARS = 80;
export const MAX_CONTENT_CHARS = 30_000;
export const MIN_PASSPHRASE_CHARS = 10;
const INNER_FORMAT = 1;

export type VaultSecret = { label: string; project: string; content: string };

export async function sealSecret(passphrase: string, secret: VaultSecret): Promise<string> {
  const inner = { f: INNER_FORMAT, label: secret.label.trim(), project: secret.project.trim(), content: secret.content };
  return encryptText(passphrase, JSON.stringify(inner));
}

/** Decrypts and checks the inside. Throws VaultCryptoError for a wrong passphrase or damaged data. */
export async function openSecret(passphrase: string, payload: string): Promise<VaultSecret> {
  const text = await decryptText(passphrase, payload);
  try {
    const d = JSON.parse(text) as Partial<{ f: number; label: unknown; project: unknown; content: unknown }>;
    if (d.f !== INNER_FORMAT || typeof d.label !== "string" || typeof d.project !== "string" || typeof d.content !== "string") throw new Error("shape");
    return { label: d.label, project: d.project, content: d.content };
  } catch {
    throw new VaultCryptoError("This vault entry is not in a format we can read.");
  }
}

export type EnvLine = { kind: "var"; key: string; value: string } | { kind: "text"; text: string };

/** Splits an .env file into lines so each value can be masked on its own. Comments and odd lines stay as plain text. */
export function parseEnv(content: string): EnvLine[] {
  return content.split(/\r?\n/).map((line): EnvLine => {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) return { kind: "text", text: line };
    let value = m[2].trim();
    const q = value[0];
    if ((q === '"' || q === "'") && value.length >= 2 && value.endsWith(q)) value = value.slice(1, -1);
    return { kind: "var", key: m[1], value };
  });
}

/** Always the same length, so the mask does not give away how long the secret is. */
export const MASK = "••••••••••••";

const COMMON = ["password", "12345678", "qwertyuiop", "letmein", "iloveyou", "administrator"];

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; ok: boolean };

/** A simple hint, not a guarantee. Long passphrases (several random words) are the best choice. */
export function passphraseStrength(p: string): Strength {
  if (p.length < MIN_PASSPHRASE_CHARS) return { score: 0, label: `Too short (use at least ${MIN_PASSPHRASE_CHARS} characters)`, ok: false };
  const lower = p.toLowerCase();
  if (COMMON.some((c) => lower.includes(c)) && p.length < 16) return { score: 0, label: "Too common", ok: false };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  let score = p.length >= 24 ? 4 : p.length >= 18 ? 3 : p.length >= 14 ? 2 : 1;
  if (classes >= 3 && score < 4) score += 1;
  if (new Set(p).size < 5) score = 0; // like "aaaaaaaaaaaa"
  const s = score as 0 | 1 | 2 | 3 | 4;
  const label = ["Too repetitive", "Weak", "OK", "Good", "Strong"][s];
  return { score: s, label, ok: s >= 2 };
}
