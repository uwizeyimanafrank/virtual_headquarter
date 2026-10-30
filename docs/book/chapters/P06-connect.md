# P06 — Connect page

**Goal:** The office where visitors sit and talk to Frank.

Tick each task `[x]` when done. Do them in order.

### [ ] P06-T01 — Connect page and terminal form
**Do:**
- Styled as an office/terminal: name, email, message. Hidden honeypot field `website`. No GitHub or social links.
**Files:** app/connect/page.tsx, components/connect/Terminal.tsx
**Done when:** Page loads and looks consistent with Home.

### [ ] P06-T02 — Submit flow
**Do:**
- Use `api()` to POST `/api/connect`. Loading, success and error states. Disable button while sending. Friendly generic error on rate limit.
**Files:** components/connect/Terminal.tsx
**Done when:** Message appears in the Office inbox.

### [ ] P06-T03 — Spam and abuse test
**Do:**
- Try empty, huge, script-tag and rapid submissions; confirm validation and rate limit work.
**Files:** -
**Done when:** All abusive inputs are refused or stored safely as plain text.
**Don't:** Always render message text as plain text in the Office (no HTML).

## Phase finish check
Public visitor can message; Frank sees it in the Office. Mark done.
