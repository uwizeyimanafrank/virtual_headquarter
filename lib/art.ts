// The drawn scenes (original vector art, no faces). Each is built in named layers so code can move every
// layer by itself (clouds drift, sun pulses, water shimmers...). See docs/book/04-art-direction.md.
// The test in lib/art.test.ts checks that every file really contains the layers listed here.

export type ArtScene = { key: string; file: string; title: string; aspect: string; layers: readonly string[] };

export const SCENES: readonly ArtScene[] = [
  { key: "hoodie-steepled", file: "/art/hoodie-steepled.svg", title: "The Strategist: hooded figure, steepled fingertips", aspect: "4:5", layers: ["bg", "stars", "aura", "figure", "face-shadow", "hood-rim", "arms", "hands", "rim", "fog"] },
  { key: "hoodie-shore-sunset", file: "/art/hoodie-shore-sunset.svg", title: "Hooded figure at the water at sunset", aspect: "16:9", layers: ["sky", "stars", "sun", "clouds", "mountains", "water", "shimmer", "figure", "rim", "glow"] },
  { key: "hoodie-storm", file: "/art/hoodie-storm.svg", title: "Hooded figure under a dark storm cloud", aspect: "16:9", layers: ["sky", "stars", "lightning", "clouds", "city", "windows", "hill", "lamp-glow", "figure", "rim", "rain"] },
  { key: "hoodie-night-desk", file: "/art/hoodie-night-desk.svg", title: "Hooded figure at a desk at night", aspect: "16:9", layers: ["wall", "window", "stars", "moon", "shelf", "books", "screen-glow", "desk", "laptop", "figure", "rim", "mug"] },
  { key: "suits-handshake", file: "/art/suits-handshake.svg", title: "Two suited silhouettes shaking hands", aspect: "3:2", layers: ["bg", "bokeh", "skyline", "left", "right", "glow", "hands"] },
  { key: "avatar-wave", file: "/art/avatar-wave.svg", title: "The avatar: hooded figure waving", aspect: "1:1", layers: ["bg", "aura", "figure", "face-shadow", "hood-rim", "arm", "rim"] },
  { key: "mood-fog", file: "/art/mood-fog.svg", title: "Fog, stars and soft light (no figure)", aspect: "16:9", layers: ["bg", "aura-a", "aura-b", "stars", "clouds", "fog"] },
];

export const sceneByKey = (key: string): ArtScene | undefined => SCENES.find((s) => s.key === key);
