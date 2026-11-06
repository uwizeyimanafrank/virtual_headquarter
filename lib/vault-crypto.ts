// Vault crypto (browser side). The passphrase and the plaintext NEVER go to the server:
// we only ever upload the string that encryptText() returns.
// Recipe (locked in DECISIONS.md): PBKDF2-SHA256 600,000 rounds -> AES-256-GCM.
// No third-party crypto library, and nothing is stored (no localStorage, no module state).

export const VAULT_FORMAT_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
// On decrypt we accept only a sane range, so a tampered payload cannot force
// a weak key (too low) or freeze the tab (too high).
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 5_000_000;

export type VaultPayload = {
  v: number;
  kdf: { iterations: number; salt: string };
  iv: string;
  cipher: string;
};

// One clean error type. Wrong passphrase and tampered data look the same on purpose:
// AES-GCM cannot tell them apart, and we must not leak extra hints.
export class VaultCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultCryptoError";
  }
}

const BAD_KEY_OR_DATA = "Could not decrypt: wrong passphrase, or the data was changed.";
const BAD_FORMAT = "This vault entry is not in a format we can read.";

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    // crypto.subtle only exists on secure pages (https or the local dev address).
    throw new VaultCryptoError("This browser or page cannot do secure encryption (needs https).");
  }
  return subtle;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(length));
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunked so big files do not overflow the argument limit of fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new VaultCryptoError(BAD_FORMAT);
  }
}

// The key is non-extractable: JavaScript can use it but cannot read its bytes back.
async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const material = await subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts text with a passphrase. Returns a JSON string that is safe to upload. */
export async function encryptText(passphrase: string, plaintext: string): Promise<string> {
  if (!passphrase) throw new VaultCryptoError("A passphrase is required.");
  const salt = randomBytes(SALT_BYTES); // fresh every time, so equal inputs give different outputs
  const iv = randomBytes(IV_BYTES); // never reuse an IV with the same key
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const cipher = await getSubtle().encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const payload: VaultPayload = {
    v: VAULT_FORMAT_VERSION,
    kdf: { iterations: PBKDF2_ITERATIONS, salt: toBase64(salt) },
    iv: toBase64(iv),
    cipher: toBase64(new Uint8Array(cipher)),
  };
  return JSON.stringify(payload);
}

function parsePayload(text: string): VaultPayload {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new VaultCryptoError(BAD_FORMAT);
  }
  const p = data as Partial<VaultPayload> | null;
  if (
    !p ||
    typeof p !== "object" ||
    p.v !== VAULT_FORMAT_VERSION ||
    !p.kdf ||
    typeof p.kdf.salt !== "string" ||
    !Number.isInteger(p.kdf.iterations) ||
    typeof p.iv !== "string" ||
    typeof p.cipher !== "string"
  ) {
    throw new VaultCryptoError(BAD_FORMAT);
  }
  if (p.kdf.iterations < MIN_ITERATIONS || p.kdf.iterations > MAX_ITERATIONS) {
    throw new VaultCryptoError(BAD_FORMAT);
  }
  return p as VaultPayload;
}

/** Decrypts a string made by encryptText(). Throws VaultCryptoError on any problem. */
export async function decryptText(passphrase: string, payload: string): Promise<string> {
  if (!passphrase) throw new VaultCryptoError("A passphrase is required.");
  const p = parsePayload(payload);
  const salt = fromBase64(p.kdf.salt);
  const iv = fromBase64(p.iv);
  const cipher = fromBase64(p.cipher);
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES || cipher.length < 16) {
    throw new VaultCryptoError(BAD_FORMAT);
  }
  const key = await deriveKey(passphrase, salt, p.kdf.iterations);
  try {
    const plain = await getSubtle().decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    // Do not pass the original error on: keep the message the same for every failure.
    throw new VaultCryptoError(BAD_KEY_OR_DATA);
  }
}
