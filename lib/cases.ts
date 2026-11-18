import { inCases, type ItemType } from "@/lib/item-types";
import type { MuseumChapter, MuseumItemData } from "@/lib/museum";

// What the Glass Cases hall shows and how it filters (P12-T05). Pure logic.

export const CHIPS = ["all", "certificate", "project", "book", "reference", "other"] as const;
export type Chip = (typeof CHIPS)[number];

export const CHIP_LABELS: Record<Chip, string> = { all: "All", certificate: "Certificates", project: "Projects", book: "Books", reference: "References", other: "Other" };

/** Stories (and anything that is not one of the four named kinds) sit under "Other". */
export const chipOf = (t: ItemType): Exclude<Chip, "all"> => (t === "certificate" || t === "project" || t === "book" || t === "reference" ? t : "other");

/** Every piece the cases hall may show (display "case" or "both"), in the museum's own order. */
export const casesItems = (chapters: readonly MuseumChapter[]): MuseumItemData[] => chapters.flatMap((c) => c.items).filter((i) => inCases(i.display));

/** Only chips that have at least one piece are offered (plus "all"). */
export const availableChips = (items: readonly MuseumItemData[]): Chip[] => CHIPS.filter((c) => c === "all" || items.some((i) => chipOf(i.type) === c));

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");

/** Filter by chip and search words (every word must appear in the title, text or skills), featured pieces first, otherwise the given order. */
export function filterCases(items: readonly MuseumItemData[], chip: Chip, query: string): MuseumItemData[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const hit = (i: MuseumItemData) => {
    if (chip !== "all" && chipOf(i.type) !== chip) return false;
    if (words.length === 0) return true;
    const hay = norm([i.title, i.description, i.howIEarnedIt, ...i.skills].join(" "));
    return words.every((w) => hay.includes(w));
  };
  const kept = items.filter(hit);
  return [...kept.filter((i) => i.featured), ...kept.filter((i) => !i.featured)];
}
