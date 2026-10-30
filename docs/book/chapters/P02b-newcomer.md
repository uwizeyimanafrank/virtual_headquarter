# P02b — Newcomer guide and sample content

**Goal:** First-run guide, sample data so the site never looks empty, and a Config Doctor that guides setup of backend and database.

Tick each task `[x]` when done. Do them in order.

### [x] P02b-T01 — Onboarding state
**Do:**
- Use `settings.onboarding` (completed, steps map). Add helpers `markStep(stepKey)` and `getChecklist()`.
- Steps: profilePhoto, about, documents, firstCertificate, firstProject, database, cloudinaryGemini, secureOffice, firstVaultEntry.
**Files:** lib/onboarding.ts
**Done when:** Marking a step persists and shows in the checklist data.

### [x] P02b-T02 — Bundled sample assets
**Do:**
- Create simple placeholder images (SVG) in `public/samples/` for profile, project, certificate, story, book. No external services.
**Files:** public/samples/*
**Done when:** Files exist and load.

### [x] P02b-T03 — Sample seeding
**Do:**
- `lib/samples.ts`: `ensureSamples()` creates 2 sample projects, 2 certificates, 1 story, 1 book, plus placeholder profile in settings, all with `isSample: true`. Idempotent (running twice creates no duplicates).
- Run it automatically on first Office open when the collection has no real items.
**Files:** lib/samples.ts
**Done when:** Fresh database shows a full-looking Museum via GET /api/museum.

### [x] P02b-T04 — Sample visibility rules
**Do:**
- Setting `showSamples` toggles samples on the public API.
- Optional toggle `autoHideSamples`: when a real published item of a type exists, samples of that type are hidden automatically.
- Buttons: Hide samples, Delete all samples (delete requires step-up).
**Files:** lib/samples.ts, app/api/admin/samples/route.ts
**Done when:** Publishing a real certificate hides sample certificates when autoHide is on.

### [x] P02b-T05 — Dashboard banners and badges
**Do:**
- Show a **SAMPLE** badge on every sample row in Office lists.
- Dashboard banner: count of sample items visible publicly with the two action buttons.
**Files:** components/office/SampleBanner.tsx
**Done when:** Banner count matches the public API.

### [x] P02b-T06 — Setup checklist and spotlight tour
**Do:**
- Checklist card with progress bar; each step has a button that jumps to the right Office page.
- Light spotlight tour (no heavy library): one tooltip per Office area, skippable, can be restarted from the menu.
- Never block the user; every step skippable.
**Files:** components/office/SetupChecklist.tsx, components/office/Tour.tsx
**Done when:** First login shows the tour once; skip works; progress saved.

### [x] P02b-T07 — Config Doctor page
**Do:**
- Page `/office/setup/doctor` runs checks via `/api/admin/doctor`: env presence, DB reachable, Cloudinary reachable, Gemini key present.
- Each failing check shows plain-words reason and a **Why this matters** line.
- **Test without saving:** textbox to paste a MongoDB URI or Cloudinary values and test them with a temporary connection. Never store or log the pasted value.
- Deployment tabs: Local, Render, Vercel with a checklist of exactly which env vars to set where. The app cannot change host env vars itself, so it only guides, then re-tests.
**Files:** app/(office)/office/setup/doctor/page.tsx, app/api/admin/doctor/route.ts
**Done when:** Wrong MongoDB URI pasted gives a human reason (auth, network, format) and nothing is saved.
**Don't:** Never return or echo the pasted secret.

## Phase finish check
Fresh database + login shows tour, sample content on public site, doctor page works. Mark done.
