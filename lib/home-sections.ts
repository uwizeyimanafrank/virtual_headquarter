import { isPlaceholderPicture } from "@/lib/card-wall";
import type { HomeItem } from "@/lib/home";

// Pure logic for the Stats, What I build and Journey blocks on Home (P11-T13).
// Words come from the block content the owner edits in Office > Home layout. Nothing is invented here:
// a stat with an empty number or label is simply not shown.

export type Stat = { value: string; label: string };
export type Card = { title: string; text: string };
export type Step = { id: string; date: string; kind: string; title: string; text: string; sample: boolean };

/** Up to four stats. Both the number and the label must be filled in. */
export function buildStats(content: Record<string, string>): Stat[] {
  const out: Stat[] = [];
  for (const n of [1, 2, 3, 4]) {
    const value = (content[`stat${n}Value`] ?? "").trim();
    const label = (content[`stat${n}Label`] ?? "").trim();
    if (value && label) out.push({ value, label });
  }
  return out;
}

/** Up to three cards. A card needs a title; the text is optional. */
export function buildCards(content: Record<string, string>): Card[] {
  const out: Card[] = [];
  for (const n of [1, 2, 3]) {
    const title = (content[`card${n}Title`] ?? "").trim();
    if (title) out.push({ title, text: (content[`card${n}Text`] ?? "").trim() });
  }
  return out;
}

const KINDS: Record<string, string> = { story: "Story", certificate: "Certificate", project: "Project" };
export const MAX_STEPS = 8;

/** The built-in sample items are marked in the database, but Home data does not carry the flag; these three signs are enough. */
export const isSampleItem = (i: Pick<HomeItem, "id" | "title" | "mediaUrl">) => /^demo-/.test(i.id) || /^Sample /i.test(i.title) || isPlaceholderPicture(i.mediaUrl);

/** Sample steps shown only when the owner has no stories, certificates or projects yet. Clearly marked, never presented as fact. */
export const SAMPLE_STEPS: readonly Step[] = [
  { id: "sample-1", date: "", kind: "Story", title: "Where it started", text: "Your first lines of code and what made you keep going.", sample: true },
  { id: "sample-2", date: "", kind: "Certificate", title: "Proof of the work", text: "A diploma or certificate you earned.", sample: true },
  { id: "sample-3", date: "", kind: "Project", title: "Something you built", text: "A project, and what it taught you.", sample: true },
];

/** The journey: stories, certificates and projects from oldest to newest (dates are YYYY or YYYY-MM text), capped at 8. */
export function buildJourney(items: readonly HomeItem[]): Step[] {
  const real = items
    .filter((i) => KINDS[i.type])
    .map((i): Step => ({ id: i.id, date: i.date, kind: KINDS[i.type], title: i.title, text: i.description, sample: isSampleItem(i) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .slice(0, MAX_STEPS);
  return real.length ? real : [...SAMPLE_STEPS];
}
