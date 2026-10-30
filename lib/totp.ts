import "server-only";
import { createHash, randomInt } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { connectDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto-server";
import { AdminUser } from "@/models/AdminUser";

const AAD = "totp"; // label bound into the encryption
const ISSUER = "VHQ";
const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike characters

export function newTotpSecret(accountLabel: string) {
  const secret = generateSecret();
  const uri = generateURI({ issuer: ISSUER, label: accountLabel, secret });
  return { secret, uri, enc: encryptSecret(secret, AAD) };
}

export function qrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export function generateRecoveryCodes(count = 10) {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = Array.from({ length: 10 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join("");
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

const normalizeCode = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, "");
export const hashRecoveryCode = (c: string) => createHash("sha256").update(normalizeCode(c)).digest("hex");

/** Checks a 6-digit code against an encrypted secret. Returns the time step on success (for replay blocking). */
export function checkTotp(secretEnc: string, code: string, lastStep: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const r = verifySync({ secret: decryptSecret(secretEnc, AAD), token: code, epochTolerance: 30 });
  if (!r.valid) return null;
  const step = (r as { timeStep?: number }).timeStep ?? 0;
  return step > lastStep ? step : null; // the same code can't be used twice
}

/**
 * Verifies a 6-digit authenticator code OR a one-time recovery code for this admin.
 * On success it records the use (so it cannot be repeated). Returns which method worked.
 */
export async function verifySecondFactor(adminId: unknown, input: string): Promise<"totp" | "recovery" | null> {
  await connectDb();
  const admin = await AdminUser.findById(adminId);
  if (!admin || !admin.totpEnabled || !admin.totpSecretEnc) return null;
  const code = input.trim();

  const step = checkTotp(admin.totpSecretEnc, code, admin.lastTotpStep);
  if (step !== null) {
    // Atomic: only succeeds if no one else used a newer step meanwhile.
    const r = await AdminUser.updateOne({ _id: admin._id, lastTotpStep: { $lt: step } }, { $set: { lastTotpStep: step } });
    return r.modifiedCount === 1 ? "totp" : null;
  }

  if (/^[a-z0-9]{5}-?[a-z0-9]{5}$/i.test(code)) {
    const h = hashRecoveryCode(code);
    // Atomic one-time use: removes the hash only if it is still there.
    const r = await AdminUser.updateOne({ _id: admin._id, recoveryCodeHashes: h }, { $pull: { recoveryCodeHashes: h } });
    return r.modifiedCount === 1 ? "recovery" : null;
  }
  return null;
}
