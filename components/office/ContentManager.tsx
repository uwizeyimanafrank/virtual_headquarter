"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { AdminItem } from "@/lib/admin-items";
import { SampleBadge } from "@/components/office/SampleBadge";
import { StepUpDialog } from "@/components/office/StepUpDialog";

const TYPES = ["story", "certificate", "project", "book", "reference"] as const;
const small = "rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong disabled:opacity-40";
const field = "rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

/** List of every Museum item: filter, search, publish/hide, reorder, edit, delete. */
export function ContentManager() {
  const base = "/" + (usePathname().split("/")[1] ?? "");
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [stepUp, setStepUp] = useState<string | null>(null); // id waiting for a fresh authenticator code

  useEffect(() => {
    let alive = true;
    api<{ items: AdminItem[] }>("/api/admin/items")
      .then((r) => alive && setItems(r.items))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  const filtering = Boolean(status || q);
  const shown = useMemo(
    () => (items ?? []).filter((i) => (!type || i.type === type) && (!status || i.status === status) && (!q || i.title.toLowerCase().includes(q.toLowerCase()))),
    [items, type, status, q],
  );

  async function toggle(i: AdminItem) {
    setError("");
    try {
      await api(`/api/admin/items/${i.id}`, { method: "PATCH", body: JSON.stringify({ status: i.status === "published" ? "draft" : "published" }) });
      reload();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); }
  }

  async function move(i: AdminItem, dir: -1 | 1) {
    if (!items) return;
    const group = items.filter((x) => x.type === i.type);
    const at = group.findIndex((x) => x.id === i.id);
    const to = at + dir;
    if (to < 0 || to >= group.length) return;
    [group[at], group[to]] = [group[to], group[at]];
    setItems([...items.filter((x) => x.type !== i.type), ...group].sort((a, b) => TYPES.indexOf(a.type as never) - TYPES.indexOf(b.type as never)));
    try { await api("/api/admin/items/reorder", { method: "POST", body: JSON.stringify({ ids: group.map((x) => x.id) }) }); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save the order."); reload(); }
  }

  async function remove(id: string) {
    setError("");
    try {
      await api(`/api/admin/items/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setStepUp(id); // needs a fresh authenticator code first
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className={`${field} min-w-40 flex-1`} placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by title" />
        <select className={field} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={field} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <Link href={`${base}/content/new`} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg">Add item</Link>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {!items && !error && <p className="text-sm text-muted">Loading...</p>}
      {items && shown.length === 0 && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">{items.length === 0 ? "Nothing here yet. Add your first item." : "No items match."}</p>}

      <ul className="space-y-2">
        {shown.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
            {i.mediaUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={i.mediaUrl} alt="" className="h-14 w-20 rounded-lg object-cover" />
              : <div className="h-14 w-20 rounded-lg bg-surface-strong" aria-hidden />}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span className="truncate">{i.title}</span>
                {i.isSample && <SampleBadge />}
              </p>
              <p className="text-xs text-muted">{i.type} &middot; {i.date}</p>
            </div>
            <button className={`${small} ${i.status === "published" ? "text-accent" : "text-muted"}`} onClick={() => toggle(i)} aria-label={`Status: ${i.status}. Click to change`}>
              {i.status === "published" ? "Published" : "Draft"}
            </button>
            <div className="flex gap-1">
              <button className={small} disabled={filtering} onClick={() => move(i, -1)} aria-label="Move up" title={filtering ? "Clear search and status filter to reorder" : "Move up"}>Up</button>
              <button className={small} disabled={filtering} onClick={() => move(i, 1)} aria-label="Move down" title={filtering ? "Clear search and status filter to reorder" : "Move down"}>Down</button>
            </div>
            <Link className={small} href={`${base}/content/${i.id}`}>Edit</Link>
            <button className={`${small} text-red-300`} onClick={() => window.confirm(`Delete "${i.title}"? This cannot be undone.`) && remove(i.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <StepUpDialog open={stepUp !== null} onClose={() => setStepUp(null)} onSuccess={() => { const id = stepUp; setStepUp(null); if (id) void remove(id); }} />
    </div>
  );
}
