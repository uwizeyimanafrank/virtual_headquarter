# P09 — Secrets vault

**Goal:** Zero-knowledge storage of .env files: the server only ever sees ciphertext.

Tick each task `[x]` when done. Do them in order.

### [ ] P09-T01 — Browser crypto module
**Do:**
- `lib/vault-crypto.ts` (client only) using Web Crypto: derive key with PBKDF2-SHA256 (600,000 iterations, 16-byte random salt), encrypt with AES-256-GCM (12-byte random IV), output versioned JSON `{v,kdf:{iterations,salt},iv,cipher}` base64.
- Export `encryptText(passphrase, plaintext)` and `decryptText(passphrase, payload)`.
**Files:** lib/vault-crypto.ts
**Done when:** Round trip works; wrong passphrase throws a clean error; two encryptions of the same text differ.
**Don't:** No third-party crypto library; no passphrase persistence anywhere (not localStorage, not memory longer than needed).

### [ ] P09-T02 — Crypto tests
**Do:**
- Add tests (Vitest is already installed since P04: `npm test`) for round trip, wrong passphrase, tampered cipher (must fail), and payload versioning.
**Files:** lib/vault-crypto.test.ts
**Done when:** `npm test` passes.

### [ ] P09-T03 — Vault API
**Do:**
- `GET/POST/DELETE /api/admin/vault`. Server validates structure and size only and stores the payload as is. Every call requireAdmin; creating/deleting/reading payload requires step-up.
- Audit vault_open and delete.
**Files:** models/VaultEntry.ts, app/api/admin/vault/*
**Done when:** Database contains no readable text.

### [ ] P09-T04 — Vault UI
**Do:**
- List of entries (label, project, date). Add entry: paste or upload `.env`, choose passphrase (confirm twice, strength hint), encrypt in browser, then upload cipher.
- Reveal: ask passphrase, decrypt in browser, show masked values with per-line reveal, auto-hide after 30 seconds and when the tab loses focus, clear clipboard after copy timeout.
- Warn: if the passphrase is lost the data cannot be recovered.
**Files:** app/(office)/office/vault/page.tsx, components/office/Vault*.tsx
**Done when:** Wrong passphrase reveals nothing; server logs show no plaintext.

### [ ] P09-T05 — Vault export/import of ciphertext
**Do:**
- Allow downloading all ciphertext as one JSON file as an offline backup, and importing it back.
**Files:** app/(office)/office/vault/backup
**Done when:** Imported backup decrypts with the same passphrase.

## Phase finish check
Run a final test: search the database and network logs for any plaintext from a test .env. There must be none. Mark done.
