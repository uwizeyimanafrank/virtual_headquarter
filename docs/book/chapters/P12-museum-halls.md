# P12 — Museum halls (glass cases and the story tour)

**Pictures:** every fixed picture on these pages is an image slot (see `docs/book/05-image-slots.md`): registry entry, `SlotImage`, replaceable in Office > Images. Pictures that belong to items the owner creates are edited inside those items.

**Goal:** the Museum becomes a building with halls. **Hall 1: the Story Tour** (what exists now, the sideways storytelling). **Hall 2: the Glass Cases** (cards behind glass with a label plate; step closer to read more; click to open a floating detail panel). Certificates, books, projects, references and anything else are added from the Office, never in code.

Tick each task `[x]` when done. Do them in order.

### [ ] P12-T01 — Data: how an item is shown
**Do:** items get `display` (`tour`, `case`, `both`), `featured`, `gallery` (several images) and an optional `video`. Keep old items working (default `both`).
**Files:** models/MuseumItem.ts, lib/item-types.ts, migration note in DECISIONS.md
**Done when:** old data loads unchanged; schema tests pass.

### [ ] P12-T02 — Hall switcher
**Do:** at the top of the Museum, two doors: Story Tour and Glass Cases (tabs on phones). Deep link `#cases`. Remember nothing in storage.
**Files:** app/(site)/museum, components/museum/HallSwitcher.tsx
**Done when:** switching never reloads data; keyboard works.

### [ ] P12-T03 — Glass case card
**Do:** `GlassCase`: glass reflection, label plate (title, date, type), spotlight that follows the pointer, "lean closer" reveal of the description on hover and focus (tap on phones), small tilt.
**Files:** components/museum/GlassCase.tsx
**Done when:** component tests; reduced motion removes tilt and spotlight.

### [ ] P12-T04 — Floating detail panel
**Do:** clicking a case opens a floating elevated panel: big media (image or video carousel), full description, skills, how it was earned, links, previous and next, Esc to close, focus trap, share link `#case=<id>`.
**Files:** components/museum/DetailPanel.tsx
**Done when:** keyboard-only use works; opens from a shared link; screen reader labels checked.

### [ ] P12-T05 — Cases hall layout, filters, search
**Do:** grid of cases grouped by type with chips (All, Certificates, Projects, Books, References, Other) and a search box; featured first; samples when empty.
**Files:** components/museum/CasesHall.tsx
**Done when:** filters and search tested; empty state shows samples.

### [ ] P12-T06 — Office: display options and live preview
**Do:** item form gets display choice, featured switch, several images, optional video, and a live preview of the case card.
**Files:** Office content manager
**Done when:** every new option saved from the Office appears in the Museum.

### [ ] P12-T07 — Video and media rules
**Do:** optional video upload to Cloudinary with an auto poster image; played muted and only in view or on hover; never autoplays with reduced motion or Save-Data; images use responsive sizes and blurred placeholders.
**Files:** lib/cloudinary.ts, components/museum/Media.tsx
**Done when:** with Save-Data on, only the poster loads; size limit enforced in the Office.
**Don't:** No autoplay with sound; no giant files (limit stated in the Office).

### [ ] P12-T08 — Tests, screenshots, docs
**Done when:** all checks clean; screenshots of both halls at three sizes.

## Phase finish check
Add a certificate, a book and a project from the Office; they appear as glass cases; open one in the floating panel by mouse, by keyboard and from a shared link. Mark done.
