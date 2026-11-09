# Art direction for the public side (P11 onward)

**Feeling:** quiet, introverted, a little cinematic. Someone who builds in silence and lets the work speak. Never loud, never stock-photo corporate.

## The characters
- **The Quiet Builder:** a hooded figure seen from behind or in silhouette. **No face, ever.** Scenes: sitting at the water at sunset; under a dark storm cloud with one light in the distance; at a desk at night with a glowing screen; on a rooftop looking at a city.
- **The Strategist (hero default):** a silhouette seated with **steepled fingertips**, head slightly lowered, **eyes in shadow, no face detail**, cold teal rim light on shoulders and hands, a soft aura behind. The mood is calm power and patience. It is inspired by that low-key, cinematic mood only; **no film stills, no actor likenesses, nothing copied**.
- **The Deal:** two suited silhouettes shaking hands. **No faces, no real people**, just shapes and a soft light between the hands. Used on the Hire page.
- **The Avatar:** a small version of the Quiet Builder that waves. Used by the floating assistant.

## Rules
- All art is **original vector (SVG)**, drawn for this project. No copyrighted characters, no stock photos, no real faces.
- Every scene is built in **named layers** (`sky`, `sun`, `clouds`, `water`, `figure`, `stars`, `glow`) so code can move each layer by itself: clouds drift, sun pulses, water shimmers, stars twinkle, figure breathes slightly.
- **Palette:** use the site's design tokens (teal accent, deep navy, warm amber for sunsets, violet for dusk). Contrast must keep text readable on top.
- **Weight budget:** one scene under 40 KB; any photo or video comes from Cloudinary, lazy loaded, with a blurred placeholder.
- **Motion budget:** at most 16 floating items on screen; pause when off screen or the tab is hidden; **everything static when the visitor prefers reduced motion**; no mouse parallax on phones.
- **Replaceable:** every scene has a built-in default AND can be replaced from the Office by uploading Frank's own image or video. Nothing is hardcoded in code.
- **Accessibility:** decorative art is hidden from screen readers (`aria-hidden`); real photos need alt text (the Office will not save a gallery photo without it).
- **Floating items:** small SVG icons (tech, tools, shapes) by default, emoji optional per item (emoji look different on every phone, so icons are the default).

## Mood recipe (also used for Frank's own photos)
Low-key light, mostly dark; one cold rim light (teal); a warm or violet glow behind the figure (the aura); fog and vignette at the edges; fine film grain; the figure always half-hidden by shadow. In the Office the "mood filter" applies this recipe to any uploaded photo.

## Cards, not 3D
The public side stays **2D**: layered images, gradients, floating cards with tilt and glow. No WebGL, no 3D scenes. Many images and cards, so visitors always find something to look at, but light enough for a phone.

## The files (done in P11-T06, listed in `lib/art.ts`)
`public/art/hoodie-steepled.svg` (The Strategist, 4:5, hero character), `hoodie-shore-sunset.svg`, `hoodie-storm.svg`, `hoodie-night-desk.svg` (all 16:9), `suits-handshake.svg` (3:2), `avatar-wave.svg` (1:1), `mood-fog.svg` (16:9, no figure). All are faceless, under 10 KB, and built in the named layers listed in `lib/art.ts`; a test checks the layers exist. Gradient ids are prefixed with the scene name so several scenes can be inlined on one page. Their code-drawn source is not kept in the repo: to change a scene, edit its SVG directly (keep the layer ids) or replace it from Office > Images.
