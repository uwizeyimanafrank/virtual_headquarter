import { z } from "zod";
import { IV_BYTES, MAX_ITERATIONS, MIN_ITERATIONS, SALT_BYTES, VAULT_FORMAT_VERSION } from "@/lib/vault-crypto";

// The server never decrypts the vault (it has no passphrase). It only checks that what the browser
// uploads has the SHAPE of our encrypted payload, so the database can only hold ciphertext-looking data:
// exact keys only (no extra field where readable text could hide), and fixed sizes.
export const MAX_VAULT_PAYLOAD_CHARS = 64 * 1024;
export const MAX_VAULT_ENTRIES = 200;

/** Number of bytes a base64 string stands for, or null if it is not clean base64. */
function base64Bytes(s: string): number | null {
  if (s.length === 0 || s.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null;
  const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;
  return (s.length / 4) * 3 - pad;
}
const b64 = (bytes: number) => z.string().refine((s) => base64Bytes(s) === bytes, `must be ${bytes} bytes of base64`);

const payloadShape = z.object({
  v: z.literal(VAULT_FORMAT_VERSION),
  kdf: z.object({ iterations: z.number().int().min(MIN_ITERATIONS).max(MAX_ITERATIONS), salt: b64(SALT_BYTES) }).strict(),
  iv: b64(IV_BYTES),
  cipher: z.string().max(MAX_VAULT_PAYLOAD_CHARS).refine((s) => (base64Bytes(s) ?? 0) >= 16, "must be base64 (at least the 16-byte GCM tag)"),
}).strict();

/** Accepts only a JSON string in the exact format made by encryptText(). The string is kept as is. */
export function parseVaultPayload(raw: unknown): { ok: true; payload: string } | { ok: false } {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_VAULT_PAYLOAD_CHARS) return { ok: false };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { ok: false }; }
  return payloadShape.safeParse(data).success ? { ok: true, payload: raw } : { ok: false };
}
