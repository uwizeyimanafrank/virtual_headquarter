# P06 — Connect page

**Goal:** The office where visitors sit and talk to Frank.

Tick each task `[x]` when done. Do them in order.

### [x] P06-T01 — Connect page and terminal form
**Do:**
- Styled as an office/terminal: name, email, message. Hidden honeypot field `website`. No GitHub or social links.
**Files:** app/connect/page.tsx, components/connect/Terminal.tsx
**Done when:** Page loads and looks consistent with Home.

### [x] P06-T02 — Submit flow
**Do:**
- Use `api()` to POST `/api/connect`. Loading, success and error states. Disable button while sending. Friendly generic error on rate limit.
**Files:** components/connect/Terminal.tsx
**Done when:** Message appears in the Office inbox.

### [x] P06-T03 — Spam and abuse test
**Do:**
- Try empty, huge, script-tag and rapid submissions; confirm validation and rate limit work.
**Files:** -
**Done when:** All abusive inputs are refused or stored safely as plain text.
**Don't:** Always render message text as plain text in the Office (no HTML).

## Status (Claude, 2026-10-31)
Done: `app/(site)/connect/page.tsx`, `components/connect/Terminal.tsx` (terminal-styled form, off-screen bot trap, friendly errors that never show server wording, double-submit guard, character counter), `lib/body.ts` (`readJsonLimited`: 20 KB limit on the contact form, 5 KB on login, 413 when too big). Verified: 12 form tests + 1 inbox test (hostile text shown as plain text) + 5 `lib/body` tests, and 40 HTTP checks in `tests/http/connect.sh` (empty, spaces, wrong types, huge, script tags, foreign origin, bot trap, 6th message gets 429 with Retry-After, only a hash of the IP is stored, nothing saved by refused requests). NOT verified in a real browser: how the page looks.

## Phase finish check
Public visitor can message; Frank sees it in the Office. Mark done.
