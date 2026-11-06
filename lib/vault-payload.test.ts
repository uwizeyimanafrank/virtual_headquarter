// @vitest-environment node
import { describe, expect, it } from "vitest";
import { encryptText } from "@/lib/vault-crypto";
import { MAX_VAULT_PAYLOAD_CHARS, parseVaultPayload } from "@/lib/vault-payload";

const make = async () => JSON.parse(await encryptText("p", "secret text"));
const check = (o: unknown) => parseVaultPayload(JSON.stringify(o)).ok;

describe("parseVaultPayload", () => {
  it("accepts what encryptText makes, and keeps the string exactly as is", async () => {
    const s = await encryptText("p", "secret text");
    expect(parseVaultPayload(s)).toEqual({ ok: true, payload: s });
  });
  it("refuses things that are not strings, empty, or too big", () => {
    for (const x of [undefined, null, 5, {}, [], ""]) expect(parseVaultPayload(x).ok).toBe(false);
    expect(parseVaultPayload("x".repeat(MAX_VAULT_PAYLOAD_CHARS + 1)).ok).toBe(false);
    expect(parseVaultPayload("not json").ok).toBe(false);
  });
  it("refuses extra fields (no place to hide readable text)", async () => {
    const p = await make();
    expect(check({ ...p, label: "my stripe key" })).toBe(false);
    expect(check({ ...p, kdf: { ...p.kdf, note: "hi" } })).toBe(false);
  });
  it("refuses wrong version, missing parts and wrong types", async () => {
    const p = await make();
    expect(check({ ...p, v: 2 })).toBe(false);
    expect(check({ ...p, iv: undefined })).toBe(false);
    expect(check({ ...p, cipher: 5 })).toBe(false);
    expect(check({ ...p, kdf: undefined })).toBe(false);
  });
  it("refuses weak or absurd iteration counts", async () => {
    const p = await make();
    for (const iterations of [1, 99_999, 5_000_001, 1.5]) expect(check({ ...p, kdf: { ...p.kdf, iterations } })).toBe(false);
  });
  it("refuses wrong salt/IV sizes, non-base64 and a cipher shorter than the GCM tag", async () => {
    const p = await make();
    expect(check({ ...p, iv: btoa("short") })).toBe(false);
    expect(check({ ...p, kdf: { ...p.kdf, salt: btoa("short") } })).toBe(false);
    expect(check({ ...p, cipher: "plain readable text!" })).toBe(false);
    expect(check({ ...p, cipher: btoa("tiny") })).toBe(false);
  });
});
