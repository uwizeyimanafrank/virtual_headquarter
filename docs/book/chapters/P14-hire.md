# P14 — Hire me

**Pictures:** every fixed picture on these pages is an image slot (see `docs/book/05-image-slots.md`): registry entry, `SlotImage`, replaceable in Office > Images. Pictures that belong to items the owner creates are edited inside those items.

**Goal:** someone who really wants to hire Frank has their own door, separate from Connect (Connect is "say hello", Hire is "let us work together").

### [ ] P14-T01 — `/hire` page
**Do:** headline, availability badge (open, busy, from a date), services cards, how I work (3 steps), 3 featured works, CV download, FAQ, and the request form. All text comes from the Office.
**Files:** app/(site)/hire, components/hire/*
**Done when:** looks finished with samples; share preview set.

### [ ] P14-T02 — Hire request API
**Do:** `HireRequest`: name, email, company, kind (full-time, contract, project), budget range, timeline, message, links. Same spam protection as Connect (honeypot, rate limit, size limits). Stored in the database, no email sent.
**Files:** models/HireRequest.ts, app/api/hire/route.ts
**Done when:** HTTP test covers success, spam, too long, rate limit.

### [ ] P14-T03 — Office: hire inbox
**Do:** a "Hire" filter in the inbox with priority, status (new, talking, won, lost), notes, unread badge; settings for availability, services and FAQ.
**Done when:** a request moves through the statuses.

### [ ] P14-T04 — Door everywhere
**Do:** a highlighted "Hire me" button in the header, hero and footer; a counter of clicks (number only, no tracking of people).
**Done when:** visible on every public page, keyboard reachable.

### [ ] P14-T05 — Handshake art, tests, docs
**Do:** use the suited-silhouettes scene on this page; tests; docs.
**Done when:** all checks clean.

## Phase finish check
Send a test hire request from a phone; it shows in the Office with priority. Mark done.
