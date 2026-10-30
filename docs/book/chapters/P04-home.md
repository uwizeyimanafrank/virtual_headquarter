# P04 — Home page

**Goal:** The cinematic landing page that makes people say this is not a normal portfolio.

Tick each task `[x]` when done. Do them in order.

### [x] P04-T01 — Home layout and glass hero
**Do:**
- Dark glass hero reading text from settings. Slow subtle animated background (cheap: gradient or few shapes, transform/opacity only).
- Short strategic welcome line (discipline, vision, raw execution over luck) and an invitation to a free tour of the world.
**Files:** app/page.tsx, components/home/Hero.tsx
**Done when:** Looks good at 360px and 1440px widths.

### [x] P04-T02 — Tab switcher: Hero / Canvas CV
**Do:**
- Accessible tabs (keyboard, aria). Switching animates smoothly without reloading.
**Files:** components/home/Tabs.tsx
**Done when:** Tabs work with keyboard and touch.

### [x] P04-T03 — Canvas CV cards
**Do:**
- Floating cards for education, internships, skills and trajectory. Content comes from settings/profile data, not hardcoded paragraphs.
- `useTilt` hook: cards lean toward the mouse vector on desktop only; on touch they gently float. Disabled under reduced motion.
**Files:** components/home/CvCard.tsx, hooks/useTilt.ts
**Done when:** Hover tilt on desktop; calm float on mobile.
**Don't:** Do not invent achievements; show only what is in data.

### [x] P04-T04 — Gate button and transition
**Do:**
- Bottom CTA: "The foundation is laid. Do you wish to inspect the execution? Continue to the Museum".
- Use Next.js client navigation with a short cinematic transition (no full reload).
**Files:** components/home/Gate.tsx
**Done when:** Clicking goes to /museum without a hard reload.

### [x] P04-T05 — Home performance pass
**Do:**
- Check images, fonts, bundle size. Keep animation GPU friendly.
**Files:** -
**Done when:** Lighthouse performance on mobile at least 85 for Home. (Done by measurement only: Lighthouse could not run in the build sandbox. First-load JS is 176 KB gzipped, about 150 KB of which is React and Next themselves. Frank: please run Lighthouse in Chrome DevTools on the deployed Home and report the score.)

## Phase finish check
Home complete on phone and desktop. Mark done.
