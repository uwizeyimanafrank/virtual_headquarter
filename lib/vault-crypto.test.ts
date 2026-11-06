// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  decryptText,
  encryptText,
  PBKDF2_ITERATIONS,
  VAULT_FORMAT_VERSION,
  VaultCryptoError,
  type VaultPayload,
} from "@/lib/vault-crypto";

const SECRET = "API_KEY=abc123\nDB_URL=mongodb://x";

// Flip one character inside a base64 string so it stays valid base64 but is different.
function flip(b64: string): string {
  const i = Math.floor(b64.length / 2);
  const c = b64[i] === "A" ? "B" : "A";
  return b64.slice(0, i) + c + b64.slice(i + 1);
}
const parse = (s: string) => JSON.parse(s) as VaultPayload;

describe("vault-crypto", () => {
  it("round trips text, including unicode and empty text", async () => {
    for (const text of [SECRET, "héllo 🔐 Kinyarwanda: Muraho", ""]) {
      const payload = await encryptText("pass-1", text);
      expect(await decryptText("pass-1", payload)).toBe(text);
    }
  }, 30000);

  it("never puts the plaintext or passphrase in the output", async () => {
    const payload = await encryptText("my-passphrase", SECRET);
    expect(payload).not.toContain("abc123");
    expect(payload).not.toContain("my-passphrase");
  });

  it("gives a different result every time (fresh salt and IV)", async () => {
    const a = parse(await encryptText("p", SECRET));
    const b = parse(await encryptText("p", SECRET));
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.cipher).not.toBe(b.cipher);
  });

  it("fails cleanly with a wrong passphrase", async () => {
    const payload = await encryptText("right", SECRET);
    const err = await decryptText("wrong", payload).catch((e) => e);
    expect(err).toBeInstanceOf(VaultCryptoError);
    expect(err.message).not.toContain("abc123");
  });

  it("rejects an empty passphrase on both sides", async () => {
    await expect(encryptText("", SECRET)).rejects.toBeInstanceOf(VaultCryptoError);
    const payload = await encryptText("p", SECRET);
    await expect(decryptText("", payload)).rejects.toBeInstanceOf(VaultCryptoError);
  });

  it("fails when the cipher, salt or IV was tampered with", async () => {
    const good = parse(await encryptText("p", SECRET));
    const bad: VaultPayload[] = [
      { ...good, cipher: flip(good.cipher) },
      { ...good, iv: flip(good.iv) },
      { ...good, kdf: { ...good.kdf, salt: flip(good.kdf.salt) } },
    ];
    for (const p of bad) {
      await expect(decryptText("p", JSON.stringify(p))).rejects.toBeInstanceOf(VaultCryptoError);
    }
  });

  it("uses the same error message for wrong passphrase and tampering", async () => {
    const good = parse(await encryptText("p", SECRET));
    const wrong = await decryptText("x", JSON.stringify(good)).catch((e) => e.message);
    const tampered = await decryptText("p", JSON.stringify({ ...good, cipher: flip(good.cipher) })).catch((e) => e.message);
    expect(wrong).toBe(tampered);
  });

  it("writes a versioned payload with the agreed settings", async () => {
    const p = parse(await encryptText("p", SECRET));
    expect(p.v).toBe(VAULT_FORMAT_VERSION);
    expect(p.kdf.iterations).toBe(PBKDF2_ITERATIONS);
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
  });

  it("refuses unknown versions and badly shaped payloads", async () => {
    const good = parse(await encryptText("p", SECRET));
    const broken = [
      JSON.stringify({ ...good, v: 2 }),
      JSON.stringify({ ...good, v: undefined }),
      JSON.stringify({ ...good, cipher: 123 }),
      JSON.stringify({ ...good, kdf: undefined }),
      "not json",
      "null",
      "[]",
    ];
    for (const text of broken) {
      await expect(decryptText("p", text)).rejects.toBeInstanceOf(VaultCryptoError);
    }
  });

  it("refuses a payload that asks for a weak or absurd iteration count", async () => {
    const good = parse(await encryptText("p", SECRET));
    for (const iterations of [1, 99_999, 5_000_001, 1.5]) {
      const p = { ...good, kdf: { ...good.kdf, iterations } };
      await expect(decryptText("p", JSON.stringify(p))).rejects.toBeInstanceOf(VaultCryptoError);
    }
  });

  it("refuses wrong salt or IV lengths and non-base64 values", async () => {
    const good = parse(await encryptText("p", SECRET));
    const short = btoa("short");
    for (const p of [
      { ...good, iv: short },
      { ...good, kdf: { ...good.kdf, salt: short } },
      { ...good, cipher: "%%%not-base64%%%" },
    ]) {
      await expect(decryptText("p", JSON.stringify(p))).rejects.toBeInstanceOf(VaultCryptoError);
    }
  });
});
