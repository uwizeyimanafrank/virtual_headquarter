// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MASK, openSecret, parseEnv, passphraseStrength, sealSecret } from "@/lib/vault-entry";
import { VaultCryptoError } from "@/lib/vault-crypto";
import { encryptText } from "@/lib/vault-crypto";

describe("seal and open", () => {
  it("round trips label, project and content", async () => {
    const s = { label: "  Stripe live ", project: "VHQ", content: "KEY=abc\n# c\nOTHER=\"x y\"" };
    const p = await sealSecret("a-long-passphrase", s);
    expect(await openSecret("a-long-passphrase", p)).toEqual({ ...s, label: "Stripe live" });
  }, 30000);
  it("hides label and project too", async () => {
    const p = await sealSecret("a-long-passphrase", { label: "SecretLabel", project: "SecretProject", content: "K=v" });
    expect(p).not.toContain("SecretLabel");
    expect(p).not.toContain("SecretProject");
  });
  it("wrong passphrase gives a clean error", async () => {
    const p = await sealSecret("a-long-passphrase", { label: "a", project: "", content: "K=v" });
    await expect(openSecret("another-passphrase", p)).rejects.toBeInstanceOf(VaultCryptoError);
  });
  it("refuses something that decrypts but is not our inner format", async () => {
    const p = await encryptText("a-long-passphrase", JSON.stringify({ hello: "world" }));
    await expect(openSecret("a-long-passphrase", p)).rejects.toBeInstanceOf(VaultCryptoError);
    const q = await encryptText("a-long-passphrase", "not json");
    await expect(openSecret("a-long-passphrase", q)).rejects.toBeInstanceOf(VaultCryptoError);
  });
});

describe("parseEnv", () => {
  it("finds variables, strips quotes and keeps comments as text", () => {
    const lines = parseEnv("# note\nA=1\nexport B = \"two words\"\nC='x'\n\nnot a var\r\nD=");
    expect(lines).toEqual([
      { kind: "text", text: "# note" },
      { kind: "var", key: "A", value: "1" },
      { kind: "var", key: "B", value: "two words" },
      { kind: "var", key: "C", value: "x" },
      { kind: "text", text: "" },
      { kind: "text", text: "not a var" },
      { kind: "var", key: "D", value: "" },
    ]);
  });
  it("treats a commented-out variable as a comment", () => {
    expect(parseEnv("# KEY=secret")[0].kind).toBe("text");
  });
  it("mask is the same for every value", () => {
    expect(MASK.length).toBe(12);
  });
});

describe("passphraseStrength", () => {
  it("rejects short, common and repetitive passphrases", () => {
    expect(passphraseStrength("short").ok).toBe(false);
    expect(passphraseStrength("password1234").ok).toBe(false);
    expect(passphraseStrength("aaaaaaaaaaaaaaaaaaaa").ok).toBe(false);
  });
  it("accepts long ones and rates them higher", () => {
    expect(passphraseStrength("correct horse battery").ok).toBe(true);
    expect(passphraseStrength("correct-horse-battery-staple-9").score).toBeGreaterThan(passphraseStrength("Abcdefg123!x").score);
  });
});
