"use client";
import { useState } from "react";
import { DISPATCH_KINDS, KIND_LABELS, type DispatchKind } from "@/lib/dispatches";
import type { PublicDispatch } from "@/lib/dispatches-public";
import { DispatchCard } from "@/components/home/DispatchCard";

/** Filter by kind without reloading: the server sends every live dispatch once, this only hides some. */
export function DispatchList({ items }: { items: PublicDispatch[] }) {
  const [kind, setKind] = useState<DispatchKind | "all">("all");
  const present = DISPATCH_KINDS.filter((k) => items.some((d) => d.kind === k));
  const shown = kind === "all" ? items : items.filter((d) => d.kind === kind);
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`;
  return (
    <div>
      {present.length > 1 && (
        <div role="group" aria-label="Filter by kind" className="mb-6 flex flex-wrap justify-center gap-2">
          <button type="button" className={chip(kind === "all")} aria-pressed={kind === "all"} onClick={() => setKind("all")}>All</button>
          {present.map((k) => <button key={k} type="button" className={chip(kind === k)} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABELS[k]}</button>)}
        </div>
      )}
      {shown.length === 0
        ? <p className="text-center text-muted">Nothing here yet.</p>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((d) => <DispatchCard key={d.id} d={d} />)}</div>}
    </div>
  );
}
