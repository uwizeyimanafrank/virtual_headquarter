"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Tour } from "@/components/office/Tour";

type Item = { key: string; title: string; desc: string; href: string; done: boolean; skipped: boolean; auto: boolean };
type Data = { items: Item[]; doneCount: number; total: number; finished: boolean; tourSeen: boolean };

const small = "rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong";

/** Setup checklist with progress bar. `compact` shows only the next few steps (used on the dashboard). */
export function SetupChecklist({ compact = false }: { compact?: boolean }) {
  const base = "/" + (usePathname().split("/")[1] ?? ""); // the secret Office address
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tourManual, setTourManual] = useState(false);
  const [tourClosed, setTourClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Data>("/api/admin/onboarding").then((d) => alive && setData(d)).catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, []);

  async function post(payload: object) {
    try { setData(await api<Data>("/api/admin/onboarding", { method: "POST", body: JSON.stringify(payload) })); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); }
  }
  const closeTour = () => { setTourManual(false); setTourClosed(true); void post({ action: "tour", seen: true }); };

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return null;
  const pct = Math.round((data.doneCount / data.total) * 100);
  const shown = compact ? data.items.filter((i) => !i.done && !i.skipped).slice(0, 3) : data.items;

  return (
    <section className="mb-8 rounded-2xl border border-line bg-surface p-4">
      <Tour open={tourManual || (!data.tourSeen && !tourClosed)} onClose={closeTour} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{data.finished ? "Setup complete" : "Getting started"}</h2>
        <div className="flex items-center gap-2">
          <button className={small} onClick={() => setTourManual(true)}>Take the tour</button>
          {compact && <Link className={small} href={`${base}/setup`}>All steps</Link>}
          {!compact && <Link className={small} href={`${base}/setup/doctor`}>Open Config Doctor</Link>}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-strong" aria-label={`${pct}% done`}>
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">{data.doneCount} of {data.total} steps done. Every step can be skipped and finished later.</p>

      <ul className="mt-4 space-y-2">
        {shown.map((i) => (
          <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm">
                <span className={i.done ? "text-accent" : i.skipped ? "text-muted" : "text-fg"}>{i.done ? "Done" : i.skipped ? "Skipped" : "To do"}</span>
                <span className="mx-2 text-muted">&middot;</span>{i.title}
              </p>
              {!compact && <p className="text-xs text-muted">{i.desc}</p>}
            </div>
            <div className="flex gap-1.5">
              {!i.done && <Link className={small} href={`${base}${i.href}`}>Go</Link>}
              {!i.done && !i.skipped && !i.auto && <button className={small} onClick={() => post({ action: "step", step: i.key, state: "done" })}>Mark done</button>}
              {!i.done && !i.skipped && <button className={small} onClick={() => post({ action: "step", step: i.key, state: "skipped" })}>Skip</button>}
              {i.skipped && <button className={small} onClick={() => post({ action: "step", step: i.key, state: "clear" })}>Undo skip</button>}
            </div>
          </li>
        ))}
        {compact && shown.length === 0 && <li className="text-sm text-muted">Nothing left to do. Nice.</li>}
      </ul>
    </section>
  );
}
