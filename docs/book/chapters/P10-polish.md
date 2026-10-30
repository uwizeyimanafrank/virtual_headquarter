# P10 — Polish, audit and deploy

**Goal:** Make it fast, accessible, safe, and deployed.

Tick each task `[x]` when done. Do them in order.

### [ ] P10-T01 — Performance audit
**Do:**
- Lighthouse on Home, Museum, Connect (mobile). Fix largest issues.
**Files:** -
**Done when:** Mobile performance at least 85 on all three public pages.

### [ ] P10-T02 — Accessibility pass
**Do:**
- Keyboard navigation, focus states, alt text, contrast, reduced motion check on every page.
**Files:** -
**Done when:** No critical a11y issues in an automated check.

### [ ] P10-T03 — SEO and share previews
**Do:**
- Titles, descriptions, Open Graph and Twitter-card images so shared links look good on WhatsApp.
**Files:** app/layout.tsx, app/opengraph-image.*
**Done when:** Link preview shows image and title.

### [ ] P10-T04 — Backups
**Do:**
- Office button to export all Museum content and settings as JSON, and import it back.
**Files:** app/api/admin/backup/*
**Done when:** Export then import on a fresh DB restores content.

### [ ] P10-T05 — Security review
**Do:**
- Walk the checklist in `docs/book/03-security-checklist.md`. Run `npm audit`. Fix or document each item.
**Files:** docs/book/03-security-checklist.md
**Done when:** Every checklist line is ticked or has a written reason.

### [ ] P10-T06 — Deploy guide and first deploy
**Do:**
- Write `docs/DEPLOY.md` for Render and Vercel: build command, start command, env table, Atlas IP allowlist, domain.
- [HUMAN] Frank deploys and confirms `/api/health` is green and login works.
**Files:** docs/DEPLOY.md
**Done when:** Same code deployed on a host with only env changed.

### [ ] P10-T07 — Final cleanup
**Do:**
- Remove unused code and packages. Update README. Set all phases to done in STATE.md.
**Files:** -
**Done when:** `npm run build` clean; STATE.md shows all done.

## Phase finish check
Project complete. Frank decides what to build next (new Museum chapters, notifications, more adapters).
