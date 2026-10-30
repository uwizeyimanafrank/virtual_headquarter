# P01 — Data models and public API

**Goal:** Schemas for all public content and the two public API routes, safe against bad input and spam.

Tick each task `[x]` when done. Do them in order.

### [x] P01-T01 — MuseumItem model
**Do:**
- Create Mongoose model per `docs/book/01-architecture.md`.
- Add indexes: (type, status, order) and (status, date).
- Validate `date` with regex `^\d{4}-(0[1-9]|1[0-2])$` and `gradeOrLink` as a URL when present.
**Files:** models/MuseumItem.ts
**Done when:** Creating an item with a bad date throws a validation error.

### [x] P01-T02 — Message model
**Do:**
- Fields per architecture doc. Store `ipHash` (SHA-256 of ip + SESSION_SECRET-based salt), never the raw IP.
- Add index on createdAt.
**Files:** models/Message.ts
**Done when:** Model compiles; test insert works.

### [x] P01-T03 — Settings singleton model
**Do:**
- One document with heroTitle, heroText, chapterTitles, profile, onboarding, showSamples (default true), theme.
- Add `getSettings()` helper that creates the default document if missing.
**Files:** models/Settings.ts, lib/settings.ts
**Done when:** `getSettings()` called twice returns the same single document.

### [x] P01-T04 — Shared zod schemas
**Do:**
- Create `lib/validation.ts` with schemas for museum item input, contact message input, and common limits (title 120, description 4000, message 2000).
**Files:** lib/validation.ts
**Done when:** Schemas reject over-length strings and unknown types.

### [x] P01-T05 — Rate limiter
**Do:**
- `models/RateLimit.ts` with TTL index on expiresAt. `lib/rateLimit.ts`: `rateLimit(key, max, windowSec)` using an atomic upsert/increment.
- Works in serverless (no in-memory state).
**Files:** models/RateLimit.ts, lib/rateLimit.ts
**Done when:** Calling it past the max returns `{ok:false}`; counters expire on their own.

### [x] P01-T06 — GET /api/museum
**Do:**
- Return only `published` items, sorted by chapter order then `order`, optional `?type=`.
- Respect `settings.showSamples` (hide `isSample` items when false).
- Strip internal fields. Short cache headers (`s-maxage=60, stale-while-revalidate=300`).
**Files:** app/api/museum/route.ts
**Done when:** Returns published items only; drafts never appear.

### [x] P01-T07 — POST /api/connect
**Do:**
- Validate with zod. Honeypot field named `website` (if filled, return success but save nothing).
- Rate limit per ipHash: 5 per hour. Return the same generic success message on every non-error path.
- Save to messages. Never echo input back.
**Files:** app/api/connect/route.ts
**Done when:** Valid post saves; 6th post in an hour is refused; honeypot post saves nothing.
**Don't:** Do not reveal which check failed.

### [x] P01-T08 — Test notes
**Do:**
- Write `docs/TESTING.md` with copy-paste curl commands for health, museum list and connect (using `$APP_URL` variable, not a literal address).
**Files:** docs/TESTING.md
**Done when:** File exists and commands work.

## Phase finish check
All routes work; build passes; nothing public returns secrets or drafts.
