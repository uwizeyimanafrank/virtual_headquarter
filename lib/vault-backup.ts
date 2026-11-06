import { MAX_VAULT_ENTRIES, MAX_VAULT_PAYLOAD_CHARS, parseVaultPayload } from "@/lib/vault-payload";

// An offline backup is just the encrypted entries in one file. It is never decrypted to make it,
// so the file is exactly as safe as the vault itself, and it only opens with the same passphrases.
export const BACKUP_KIND = "vhq-vault-backup";
export const BACKUP_VERSION = 1;
const MAX_BACKUP_CHARS = MAX_VAULT_ENTRIES * (MAX_VAULT_PAYLOAD_CHARS + 100);

export function makeBackup(payloads: string[], now: Date = new Date()): string {
  const entries = payloads.map((p) => JSON.parse(p) as unknown);
  return JSON.stringify({ kind: BACKUP_KIND, v: BACKUP_VERSION, exportedAt: now.toISOString(), entries }, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  return `vhq-vault-backup-${now.toISOString().slice(0, 10)}.json`;
}

export type ParsedBackup = { ok: true; payloads: string[]; invalid: number } | { ok: false; error: string };

/** Reads a backup file. Every entry must pass the same shape check as a normal upload; bad ones are counted and left out. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, error: "That file is too big to be a vault backup." };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "That file is not a vault backup (it is not valid JSON)." }; }
  const d = data as { kind?: unknown; v?: unknown; entries?: unknown } | null;
  if (!d || d.kind !== BACKUP_KIND) return { ok: false, error: "That file is not a vault backup." };
  if (d.v !== BACKUP_VERSION) return { ok: false, error: "That backup was made by a newer version and cannot be read here." };
  if (!Array.isArray(d.entries)) return { ok: false, error: "That backup has no entries list." };
  const payloads: string[] = [];
  let invalid = 0;
  for (const e of d.entries.slice(0, MAX_VAULT_ENTRIES)) {
    const r = parseVaultPayload(JSON.stringify(e));
    if (r.ok) payloads.push(r.payload); else invalid++;
  }
  invalid += Math.max(0, d.entries.length - MAX_VAULT_ENTRIES);
  return { ok: true, payloads, invalid };
}
