# P13 — Dispatches (news) and the public Gallery

**Goal:** the site feels alive. **Dispatches** are short updates from the HQ (news, what I am building now, what I am learning, a win, a note). The **Gallery** is a stylish public wall of random images Frank uploads. Both are managed in the Office.

### [ ] P13-T01 — Dispatch model and public API
**Do:** `Dispatch`: title, short text, kind (`news`, `building`, `learning`, `win`, `note`), optional image or video, date, pinned, publish and expire dates, published. `GET /api/dispatches` returns only published and not expired items, cached.
**Files:** models/Dispatch.ts, app/api/dispatches/route.ts, tests
**Done when:** scheduled items appear and expire on time (tested with a fake clock).

### [ ] P13-T02 — Office: Dispatches manager
**Do:** create, edit, schedule, pin, delete; three sample dispatches when none exist (marked sample).
**Files:** Office dispatches page
**Done when:** a new dispatch shows on Home within the cache time.

### [ ] P13-T03 — Home block, /dispatches page, feed
**Do:** a ticker strip and "Latest from the HQ" (3 cards) on Home; `/dispatches` with filter by kind; `/feed.xml` (RSS).
**Files:** components/home/Dispatches.tsx, app/(site)/dispatches, app/feed.xml/route.ts
**Done when:** feed validates; pages have share previews.

### [ ] P13-T04 — Gallery models
**Do:** `GalleryImage` (image, caption, alt text **required**, album, taken date, order, published) and `Album`. Location data is stripped from every upload.
**Files:** models/GalleryImage.ts, models/Album.ts, upload route
**Done when:** a test confirms no GPS data remains in stored images; alt text required.

### [ ] P13-T05 — Office: gallery manager
**Do:** upload many files at once, drag to reorder, captions and alt text, albums, publish switch.
**Done when:** 10 images upload in one go and reorder.

### [ ] P13-T06 — Public `/gallery`
**Do:** a stylish wall: scattered polaroid look on desktop (slight random tilt, lift on hover), masonry on phones, albums as chapters, lightbox with swipe and keyboard, lazy loading with blurred placeholders. A teaser strip on Home.
**Files:** app/(site)/gallery, components/gallery/*
**Done when:** 100 images stay smooth on a phone (lazy); keyboard lightbox works.

### [ ] P13-T07 — Tests, screenshots, docs
**Done when:** all checks clean.

## Phase finish check
Publish a dispatch and five photos from the Office; see them on Home, `/dispatches` and `/gallery`. Mark done.
