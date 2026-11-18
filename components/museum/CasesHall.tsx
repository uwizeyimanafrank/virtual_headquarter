"use client";

import { useMemo, useState } from "react";
import { GlassCase } from "@/components/museum/GlassCase";
import { availableChips, CHIP_LABELS, filterCases, type Chip } from "@/lib/cases";
import type { MuseumItemData } from "@/lib/museum";

/** The Glass Cases hall: a grid of cases with filter chips and a search box. Opening a case is reported upwards. */
export function CasesHall({ items, onOpen }: { items: readonly MuseumItemData[]; onOpen: (item: MuseumItemData, trigger: HTMLElement) => void }) {
  const [chip, setChip] = useState<Chip>("all");
  const [query, setQuery] = useState("");
  const chips = useMemo(() => availableChips(items), [items]);
  const shown = useMemo(() => filterCases(items, chip, query), [items, chip, query]);
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4">
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        <div role="group" aria-label="Filter by kind" className="flex flex-wrap justify-center gap-1.5">
          {chips.map((c) => (
            <button key={c} type="button" aria-pressed={chip === c} onClick={() => setChip(c)} className={`rounded-full border px-3.5 py-1.5 text-sm transition ${chip === c ? "border-accent bg-accent text-bg" : "border-line text-muted hover:text-fg"}`}>{CHIP_LABELS[c]}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="cases-search">Search the cases</label>
        <input id="cases-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-44 rounded-full border border-line bg-surface px-4 py-1.5 text-sm" />
      </div>
      <p role="status" className="sr-only">{shown.length} {shown.length === 1 ? "piece" : "pieces"} shown</p>
      {shown.length === 0 ? (
        <p className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center text-muted">Nothing matches. Try another kind or a different word.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => <li key={i.id}><GlassCase item={i} onOpen={onOpen} /></li>)}
        </ul>
      )}
    </div>
  );
}
