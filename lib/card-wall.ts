import { SCENES } from "@/lib/art";
import type { HomeItem } from "@/lib/home";

// The card wall on Home (P11-T11): many image cards in a loose, overlapping layout. Pure logic so it can be tested:
// which cards to show, in what order, and how each one is tilted. Nothing here is random, so the server and the
// browser always agree (no hydration mismatch).

export type WallCard = {
  id: string; kind: "item" | "mood"; tag: string; title: string; line: string;
  image: string; href: string; sample: boolean;
};

export const MIN_CARDS = 12;
export const MAX_CARDS = 24;

const TAGS: Record<string, string> = { story: "Story", certificate: "Certificate", project: "Project", book: "Book", reference: "Reference" };

/** Quiet one-liners in the introvert voice. Placeholders until the owner makes his own mood cards (P13 dispatches). */
export const MOOD_LINES: readonly string[] = [
  "I build in silence and let the work do the talking.",
  "Most of the good ideas arrive at night.",
  "Calm is a skill. I practise it daily.",
  "Small steps, done every day, beat big plans.",
  "I would rather ship than shout.",
  "Behind every clean interface is a messy night of fixing.",
  "Listening first. Building second.",
  "Quiet people notice the details.",
];
const MOOD_SCENES = ["hoodie-shore-sunset", "hoodie-storm", "hoodie-night-desk", "hoodie-steepled", "mood-fog"];

/** The built-in sample pictures have words drawn into them; on a card they would fight with the card's own text. */
export const isPlaceholderPicture = (url: string) => url.startsWith("/samples/");

const sceneFile = (i: number) => SCENES.find((s) => s.key === MOOD_SCENES[i % MOOD_SCENES.length])!.file;

/** The first sentence of a text, kept short. */
export function oneLine(text: string, max = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  const first = t.split(/(?<=[.!?])\s/)[0] ?? t;
  return first.length <= max ? first : first.slice(0, max - 1).trimEnd() + "…";
}

function moodCard(i: number): WallCard {
  const scene = SCENES.find((s) => s.key === MOOD_SCENES[i % MOOD_SCENES.length])!;
  return { id: `mood-${i}`, kind: "mood", tag: "Mood", title: "", line: MOOD_LINES[i % MOOD_LINES.length], image: scene.file, href: "/museum", sample: true };
}

/** The cards to show: the owner's items first, with a mood card after every two for rhythm, padded to at least 12. */
export function buildCards(items: readonly HomeItem[], opts: { min?: number; max?: number } = {}): WallCard[] {
  const min = opts.min ?? MIN_CARDS;
  const max = Math.min(opts.max ?? MAX_CARDS, MAX_CARDS);
  const real: WallCard[] = items.filter((i) => i.mediaUrl).map((i, n) => ({
    id: i.id, kind: "item", tag: TAGS[i.type] ?? "Work", title: i.title, line: oneLine(i.description || i.title),
    image: isPlaceholderPicture(i.mediaUrl) ? sceneFile(n + 1) : i.mediaUrl, href: `/museum#case=${encodeURIComponent(i.id)}`, sample: /^demo-/.test(i.id) || isPlaceholderPicture(i.mediaUrl),
  }));
  const out: WallCard[] = [];
  let m = 0;
  real.slice(0, max).forEach((c, idx) => { out.push(c); if (idx % 2 === 1 && out.length < max) out.push(moodCard(m++)); });
  while (out.length < Math.min(min, max)) out.push(moodCard(m++));
  return out.slice(0, max);
}

/** A small repeatable number from text (same text, same number, on the server and in the browser). */
export function hashText(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export type CardLook = { rotate: number; lift: number; shape: "tall" | "wide" | "square" };

/** How loosely a card sits: a slight tilt (-3.6 to 3.6 degrees), a small vertical offset, and one of three shapes. */
export function cardLook(id: string): CardLook {
  const h = hashText(id);
  return { rotate: Math.round(((h % 9) - 4) * 0.9 * 10) / 10, lift: ((h >> 3) % 5 - 2) * 8, shape: (["tall", "wide", "square"] as const)[(h >> 6) % 3] };
}
