// @vitest-environment node
import { describe, expect, it } from "vitest";
import { backupFileName, makeBackup, parseBackup } from "@/lib/vault-backup";
import { openSecret, sealSecret } from "@/lib/vault-entry";

describe("vault backup", () => {
  it("round trips: an imported backup decrypts with the same passphrase", async () => {
    const a = await sealSecret("first-long-passphrase", { label: "A", project: "P", content: "K=1" });
    const b = await sealSecret("second-long-passphrase", { label: "B", project: "", content: "K=2" });
    const file = makeBackup([a, b]);
    const r = parseBackup(file);
    expect(r).toEqual({ ok: true, payloads: [a, b], invalid: 0 }); // exactly the same strings
    if (!r.ok) throw new Error("unreachable");
    expect((await openSecret("first-long-passphrase", r.payloads[0])).content).toBe("K=1");
    expect((await openSecret("second-long-passphrase", r.payloads[1])).label).toBe("B");
  }, 30000);

  it("the file holds no readable text", async () => {
    const a = await sealSecret("first-long-passphrase", { label: "SecretName", project: "SecretProject", content: "TOKEN=plain-999" });
    const file = makeBackup([a]);
    for (const word of ["SecretName", "SecretProject", "plain-999", "first-long-passphrase"]) expect(file).not.toContain(word);
  });

  it("refuses files that are not backups", () => {
    for (const t of ["not json", "null", "[]", JSON.stringify({ kind: "something-else", v: 1, entries: [] }), JSON.stringify({ kind: "vhq-vault-backup", v: 1 })]) {
      expect(parseBackup(t).ok).toBe(false);
    }
    expect(parseBackup(JSON.stringify({ kind: "vhq-vault-backup", v: 2, entries: [] })).ok).toBe(false);
  });

  it("counts and skips entries that are not valid ciphertext", async () => {
    const a = await sealSecret("first-long-passphrase", { label: "A", project: "", content: "K=1" });
    const text = JSON.stringify({ kind: "vhq-vault-backup", v: 1, entries: [JSON.parse(a), { name: "x", value: "plain" }, "text", null] });
    expect(parseBackup(text)).toEqual({ ok: true, payloads: [a], invalid: 3 });
  });

  it("names the file with the date", () => {
    expect(backupFileName(new Date("2026-11-06T10:00:00Z"))).toBe("vhq-vault-backup-2026-11-06.json");
  });
});
