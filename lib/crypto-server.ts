import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for secrets the SERVER must be able to read again
 * (for example the 2FA secret). The key comes from SERVICE_CRED_KEY (32 random bytes, base64).
 * This is NOT the zero-knowledge vault: the vault never lets the server decrypt.
 * `aad` labels what is being encrypted, so a value cannot be swapped between uses.
 */
function key(): Buffer {
  const k = Buffer.from(requireEnv("SERVICE_CRED_KEY"), "base64");
  if (k.length !== 32) {
    throw new Error("SERVICE_CRED_KEY must be 32 random bytes in base64. See docs/book/ENV.md for the command to make one.");
  }
  return k;
}

export function encryptSecret(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, aad: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unreadable encrypted value");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
