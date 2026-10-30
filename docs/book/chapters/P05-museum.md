# P05 — Museum

**Goal:** Sideways storytelling on large screens, light vertical timeline on small ones, with popups explaining each piece.

Tick each task `[x]` when done. Do them in order.

### [ ] P05-T01 — Museum data and chapters
**Do:**
- Server component fetches published items grouped into chapters: About, Certificates, Projects, Books and References. Chapter titles from settings.
**Files:** app/museum/page.tsx, lib/museum.ts
**Done when:** Data structure ready for both layouts.

### [ ] P05-T02 — Mobile vertical timeline first
**Do:**
- Light vertical card timeline with swipe-friendly cards. Staggered reveal as items near the viewport (IntersectionObserver).
- This is the fallback used under 768px and with reduced motion.
**Files:** components/museum/VerticalTimeline.tsx
**Done when:** Smooth and light on a 360px screen.

### [ ] P05-T03 — Card and popup modal
**Do:**
- Glass modal (`backdrop-blur`) with title, description, date, skills, optional link, how-I-earned-it. Focus trap, Escape to close, scroll lock.
**Files:** components/museum/ItemModal.tsx
**Done when:** Keyboard-accessible; closes cleanly.

### [ ] P05-T04 — Horizontal track with GSAP
**Do:**
- `npm i gsap`. Pin the section and translate a wide track horizontally as the user scrolls vertically (ScrollTrigger).
- Each floating module gets motion based on its `parallaxSpeed`.
**Files:** components/museum/HorizontalTrack.tsx
**Done when:** Scroll down pans sideways smoothly on desktop.
**Don't:** Animate only transform/opacity.

### [ ] P05-T05 — Lazy and staggered loading
**Do:**
- Modules and images load only as they approach the viewport, one after another, not all together.
**Files:** components/museum/Module.tsx
**Done when:** Network tab shows media loading progressively.

### [ ] P05-T06 — Breakpoint switch and cleanup
**Do:**
- `useMediaQuery("(min-width: 768px)")` chooses horizontal vs vertical. When switching to vertical: kill all ScrollTriggers, revert GSAP context, remove listeners.
- Reduced motion always uses vertical.
**Files:** app/museum/MuseumClient.tsx
**Done when:** Resizing across 768px repeatedly leaves no leaks or broken scroll.

### [ ] P05-T07 — Chapter title cards and progress rail
**Do:**
- Title card per chapter with its own mood colour. Thin progress rail with clickable chapter dots.
**Files:** components/museum/Rail.tsx
**Done when:** Rail follows scroll and jumps to chapters.

## Phase finish check
Museum works on phone and desktop with sample data and real data. Mark done.
