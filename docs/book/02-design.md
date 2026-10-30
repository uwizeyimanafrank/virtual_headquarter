# Design rules
- **Look:** dark base, glassmorphism panels (backdrop-blur, 1px translucent border), one accent colour, generous spacing, large confident type. Define colours as CSS variables / Tailwind tokens, never hardcode hex in components.
- **Motion:** only transform and opacity. Stagger loads (items appear as they near the viewport, not all at once). Respect `prefers-reduced-motion`: fall back to the simple vertical layout and no parallax.
- **Mobile first:** build the vertical version first. Under 768px the horizontal Museum track must be fully destroyed (kill ScrollTrigger, remove listeners) and replaced by a light vertical card timeline. Desktop-only effects (cursor tilt, depth layers) switch on only above the breakpoint.
- **Performance:** lazy-load media, use `next/image`, Cloudinary `f_auto,q_auto`, no giant libraries on public pages.
- **Voice:** public text avoids corporate jargon; Home uses a strategic, disciplined, execution-over-luck tone.
- **Accessibility:** keyboard reachable popups with focus trap and Escape, alt text on all media, colour contrast AA.
