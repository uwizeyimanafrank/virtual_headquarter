# P11 — Art and Home v2

**Goal:** Home stops being "hero + CV". It becomes a living page: art scenes with layered motion, floating items, stats, journey, featured work, news, gallery teaser, a Hire door and the avatar teaser. **Everything is managed from the Office** (order, on/off, text, images). Read `docs/book/04-art-direction.md` first.

Tick each task `[x]` when done. Do them in order. One task per push.

### [ ] P11-T01 — Art kit (original SVG scenes)
**Do:**
- Draw `public/art/hoodie-shore-sunset.svg`, `hoodie-storm.svg`, `hoodie-night-desk.svg`, `suits-handshake.svg`, `avatar-wave.svg` with named layers (see art direction). Faceless figures only.
- `lib/art.ts`: list of scenes (key, title, file, layer names, default alt = empty because decorative).
**Files:** public/art/*.svg, lib/art.ts
**Done when:** each file under 40 KB, opens in a browser, layers have the agreed ids; a test checks every scene file exists and has its layers.
**Don't:** No faces, no copyrighted characters, no external fonts or images inside the SVG.

### [ ] P11-T02 — `Scene` component (layered motion)
**Do:**
- `components/art/Scene.tsx`: inlines the SVG and animates layers with CSS (clouds drift, sun pulse, water shimmer, stars twinkle, figure breathes). Optional soft parallax by scroll (desktop) and mouse (desktop only).
- Static when `prefers-reduced-motion`; pauses when off screen (IntersectionObserver) or tab hidden.
**Files:** components/art/Scene.tsx, tests
**Done when:** renders each scene; reduced motion gives no animation classes; no hydration warning.
**Don't:** No animation library for this (CSS only); no layout shift.

### [ ] P11-T03 — `FloatingField` (random floating items)
**Do:**
- Items at random x/y chosen after mount (no hydration mismatch), slow drift with depth (near items move more), at most 16, pause off screen and when hidden, off for reduced motion. Items are SVG icons by default, emoji optional.
**Files:** components/art/FloatingField.tsx, lib/floating-icons.ts, tests
**Done when:** unit test with a seeded random shows items inside bounds and capped at 16.
**Don't:** Do not block clicks (pointer-events none); no heavy filters on phones.

### [ ] P11-T04 — Home blocks (admin controls the layout)
**Do:**
- Settings gain `homeBlocks`: list of `{key, enabled, order, content}` for hero, stats, whatIBuild, journey, featured, dispatches, gallery, hire, avatar, now. Sample defaults so nothing is empty.
- Office page "Home layout": reorder, switch on/off, edit text, pick a scene or upload an image.
- Public Home renders blocks in order; with no database it renders the demo blocks (`lib/demo.ts`).
**Files:** models/Settings.ts, lib/home.ts, lib/demo.ts, app/office/(panel)/home-layout, components/home/*
**Done when:** reorder and toggle in the Office changes Home; unit tests for ordering and defaults; demo mode still looks finished.
**Don't:** No block content hardcoded in a component.

### [ ] P11-T05 — Hero v2: image behind, character on the side, half in shadow
**Do:**
- Full-width hero with a background image and layered gradients: a dark base gradient, a coloured glow (the "aura") behind the character, and fog and vignette at the edges.
- The character image sits on one side (left or right, a switch in the Office), partly hidden: the bottom and the inner edge fade into the gradient so only light on the shoulders and hands shows. Text sits on the other side with strong contrast.
- Default character: an original **faceless silhouette with steepled fingertips**, head slightly down, eyes in shadow, cold rim light (a calm, calculating mood). It is **replaceable by Frank's own photo**: the Office offers a "mood filter" (darken, teal tint, grain, vignette strength) so any photo gets the same look.
- Phones: the character sits behind the text with a stronger fade; text stays readable.
- **2D only.** CSS only (mask gradients, blend modes, blur glow). No 3D, no WebGL. Only a slow breathing glow.
**Files:** components/home/Hero.tsx, public/art/hoodie-steepled.svg, Office hero settings
**Done when:** screenshots at 390, 768 and 1440 px; text contrast AA; with no upload the default silhouette shows; uploading a photo applies the mood filter.
**Don't:** No real faces in the defaults; no film stills or copied images (the mood is inspired, never copied).

### [ ] P11-T06 — Card wall (many floating image cards)
**Do:**
- A block of many cards (image + one short line + a small type tag) in a loose overlapping layout, each with a slight tilt and offset. Hover or focus lifts and straightens the card and brightens its glow; click opens the detail panel (P12) or the linked page.
- Cards come from the Office: Museum items, dispatches, gallery images, and hand-made "mood cards" (an image and one line, in the quiet introvert voice).
- Optional slow image strips (two rows moving in opposite directions, pause on hover, still for reduced motion) so there is always something to look at.
- At least 12 sample cards so it never looks empty.
- 2D only (CSS transforms). Phones get a swipeable row or stack.
**Files:** components/home/CardWall.tsx, components/home/ImageStrip.tsx
**Done when:** 40 cards stay smooth on a mid-range phone (lazy images, blurred placeholders); keyboard reachable; reduced motion has no strips moving.

### [ ] P11-T07 — Backdrops for every public page
**Do:** Museum, Gallery, Dispatches, Hire and Connect each get an optional header backdrop image with gradient and glow. The Office has a "Page images" screen to set or clear each one; the default is one of the art scenes. Optional means the page still looks finished with none.
**Files:** lib/page-backdrops.ts, components/art/Backdrop.tsx, Office page images
**Done when:** each page shows its backdrop, passes contrast, and clearing falls back to the default art.

### [ ] P11-T08 — Stats, What I build, Journey blocks
**Do:** a stats strip (numbers set in the Office, no invented numbers), "What I build" cards, and a scrolling journey timeline (school, internships, projects) with the art as a backdrop.
**Files:** components/home/Stats.tsx, WhatIBuild.tsx, Journey.tsx
**Done when:** all three editable in the Office; samples shown when empty and marked sample.

### [ ] P11-T09 — Featured projects block
**Do:** project items get `problem`, `whatIDid`, `result`, tech chips, live link. Home shows 3 featured (admin picks) as "problem → action → result" cards.
**Files:** models/MuseumItem.ts, Office item form, components/home/Featured.tsx
**Done when:** a project saved in the Office appears on Home with the three parts; tests.

### [ ] P11-T10 — Canvas CV v2
**Do:** experience, education, skills with levels, links; a **Download CV** button (a PDF the owner uploads in the Office) and a clean print view.
**Files:** components/home/CanvasCv.tsx, Office settings (CV file)
**Done when:** button hidden if no PDF; print view readable on paper.

### [ ] P11-T11 — Polish layer
**Do:** scroll progress bar, soft cursor glow (desktop only), section reveal, smooth anchors; no layout shift.
**Done when:** Lighthouse mobile performance 85+ on Home (record the number in LOG.md).

### [ ] P11-T12 — Look and feel settings in the Office
**Do:** choose the scene per section, upload own image or video instead, edit the floating items, turn effects on or off.
**Done when:** every visual on Home can be changed or switched off from the Office.

### [ ] P11-T13 — Tests, screenshots, docs
**Do:** unit and component tests, screenshots at three sizes checked by eye, update README, STATE, LOG, DECISIONS.
**Done when:** `npm test`, lint, typecheck, build all clean.

## Phase finish check
Open Home on a phone and on a big screen with an empty database: a moody hero with the character half in shadow, a wall of image cards to explore, everything finished-looking (demo content), moving gently, and still when the visitor prefers reduced motion. Mark done.
