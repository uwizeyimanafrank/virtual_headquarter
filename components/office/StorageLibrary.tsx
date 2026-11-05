"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { summarizeStorage } from "@/lib/services/storage";
import type { ServiceView } from "@/lib/services/view";

const COLORS = ["bg-teal-400", "bg-indigo-400", "bg-amber-400", "bg-fuchsia-400", "bg-emerald-400", "bg-sky-400"];

/** One place to see how much space everything uses. The total is exactly the sum of the rows. */
export function StorageLibrary() {
  const [services, setServices] = useState<ServiceView[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<{ services: ServiceView[] }>("/api/admin/services/check", { method: "POST", body: JSON.stringify({}) })
      .then((r) => alive && setServices(r.services))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, []);

  if (error) return <p role="alert" className="text-sm text-red-400">{error}</p>;
  if (!services) return <p className="text-sm text-muted">Adding it up...</p>;
  const sum = summarizeStorage(services);
  const known = sum.rows.filter((r) => r.used !== null);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">Total used across {sum.withData} service{sum.withData === 1 ? "" : "s"} that report storage</p>
        <p className="mt-1 text-3xl font-semibold" data-testid="total">{formatBytes(sum.totalUsed)}{sum.totalLimit ? <span className="text-base font-normal text-muted"> of {formatBytes(sum.totalLimit)}</span> : null}</p>
        {sum.totalUsed > 0 && (
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-strong" role="img" aria-label="Share of the total used by each service">
            {known.map((r, i) => <div key={r.id} className={COLORS[i % COLORS.length]} style={{ width: `${((r.used ?? 0) / sum.totalUsed) * 100}%` }} title={`${r.name}: ${formatBytes(r.used)}`} />)}
          </div>
        )}
      </div>
      <ul className="space-y-2">
        {sum.rows.map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${r.used !== null ? COLORS[known.findIndex((k) => k.id === r.id) % COLORS.length] : "bg-slate-500"}`} aria-hidden />{r.name}<span className="text-xs text-muted">{r.type}</span></span>
            <span>{r.used === null ? <span className="text-muted">no storage data</span> : <>{formatBytes(r.used)}{r.limit ? <span className="text-muted"> of {formatBytes(r.limit)} ({Math.round(r.percent ?? 0)}%)</span> : null}</>}</span>
            {i === -1 && null}
          </li>
        ))}
        {sum.rows.length === 0 && <li className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Add services in the Developer tab first.</li>}
      </ul>
    </div>
  );
}
