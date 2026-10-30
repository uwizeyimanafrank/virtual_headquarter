# P08 — Developer tab

**Goal:** Monitor everything Frank runs, extensible without code changes, plus a storage library.

Tick each task `[x]` when done. Do them in order.

### [ ] P08-T01 — [HUMAN] Choose Service credential key
**Do:**
- Frank generates `SERVICE_CRED_KEY` (32 random bytes base64) and sets it in `.env` and on the host.
**Files:** .env
**Done when:** Frank confirms.

### [ ] P08-T02 — Service model and encrypted credentials
**Do:**
- `models/Service.ts` per architecture doc. `lib/crypto-server.ts`: AES-256-GCM encrypt/decrypt using SERVICE_CRED_KEY with random IV per value.
- Admin API to add/edit/delete services. Credentials are write-only: never returned to the browser after saving. Editing credentials needs step-up.
**Files:** models/Service.ts, lib/crypto-server.ts, app/api/admin/services/*
**Done when:** Saved credential is ciphertext in DB and never appears in any API response.

### [ ] P08-T03 — Adapter system
**Do:**
- `lib/services/types.ts`: adapter interface `{ type, check(service) -> {status, metrics[]} }`.
- Adapters: `http-health` (ping URL), `mongodb` (db.stats for own DB size), `cloudinary` (usage API), `render` (service status via API key).
- Registry maps `service.type` to adapter so new types are one file.
**Files:** lib/services/*
**Done when:** Adding a new generic HTTP service from the UI shows up/down.

### [ ] P08-T04 — Dashboard cards
**Do:**
- Cards: health, usage vs free limit (progress bar), last checked, refresh button. Use caching to avoid hammering APIs (check at most every few minutes).
**Files:** app/(office)/office/developer/page.tsx
**Done when:** Cards render for Atlas, Cloudinary and one custom service.

### [ ] P08-T05 — Storage library
**Do:**
- Aggregate storage numbers across providers into one view with totals and a simple bar chart.
**Files:** app/(office)/office/developer/library/page.tsx
**Done when:** Total matches the sum of providers.

### [ ] P08-T06 — System Reality Reminder
**Do:**
- Static page that visualises the architecture (host, Atlas cluster, Cloudinary buckets, domains, env checklist) as a permanent manual. Content editable from settings later.
**Files:** app/(office)/office/developer/reminder/page.tsx
**Done when:** Page loads with the diagram.

### [ ] P08-T07 — Down alerts (optional)
**Do:**
- If a monitored service is down on check, show a banner in the Office and log it. (Email alerts can come later.)
**Files:** lib/services/alerts.ts
**Done when:** A deliberately wrong URL shows the banner.

## Phase finish check
Frank can add a new monitored service from the UI without touching code. Mark done.
