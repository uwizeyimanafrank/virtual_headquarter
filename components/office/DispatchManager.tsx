"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dispatchState, type AdminDispatch } from "@/lib/admin-dispatches";
import { DispatchForm } from "@/components/office/DispatchForm";
import { SampleBadge } from "@/components/office/SampleBadge";
import { StepUpDialog } from "@/components/office/StepUpDialog";

const small = "rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong disabled:opacity-40";
const STATE_STYLE = { live: "text-accent", scheduled: "text-amber-300", draft: "text-muted", expired: "text-muted line-through" } as const;

/** List of every dispatch: create, edit, schedule, pin, publish/hide, delete. */
export function DispatchManager() {
  const [items, setItems] = useState<AdminDispatch[] | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminDispatch | "new" | null>(null);
  const [stepUp, setStepUp] = useState<string | null>(null); // id waiting for a fresh authenticator code

  useEffect(() => {
    let alive = true;
    api<{ items: AdminDispatch[] }>("/api/admin/dispatches")
      .then((r) => alive && setItems(r.items))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  async function patch(i: AdminDispatch, change: Partial<Pick<AdminDispatch, "pinned" | "published">>) {
    setError("");
    try { await api(`/api/admin/dispatches/${i.id}`, { method: "PATCH", body: JSON.stringify(change) }); reload(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); }
  }

  async function remove(id: string) {
    setError("");
    try { await api(`/api/admin/dispatches/${id}`, { method: "DELETE" }); reload(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setStepUp(id); // needs a fresh authenticator code first
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  const now = new Date();
  return (
    <div>
      {editing === null && <button className="mb-4 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg" onClick={() => setEditing("new")}>New dispatch</button>}
      {editing !== null && <DispatchForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {!items && !error && <p className="text-sm text-muted">Loading...</p>}
      {items && items.length === 0 && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Nothing here yet. Write your first dispatch.</p>}
      <ul className="space-y-2">
        {items?.map((i) => {
          const state = dispatchState(i, now);
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span className="truncate">{i.pinned ? "📌 " : ""}{i.title}</span>
                  {i.isSample && <SampleBadge />}
                  <span className={`text-xs ${STATE_STYLE[state]}`}>{state}</span>
                </p>
                <p className="text-xs text-muted">{i.kind} &middot; {i.date}{i.publishAt ? ` · from ${i.publishAt.slice(0, 16).replace("T", " ")} UTC` : ""}{i.expireAt ? ` · until ${i.expireAt.slice(0, 16).replace("T", " ")} UTC` : ""}</p>
              </div>
              <button className={small} onClick={() => patch(i, { published: !i.published })}>{i.published ? "Unpublish" : "Publish"}</button>
              <button className={small} onClick={() => patch(i, { pinned: !i.pinned })}>{i.pinned ? "Unpin" : "Pin"}</button>
              <button className={small} onClick={() => setEditing(i)}>Edit</button>
              <button className={`${small} text-red-300`} onClick={() => window.confirm(`Delete "${i.title}"? This cannot be undone.`) && remove(i.id)}>Delete</button>
            </li>
          );
        })}
      </ul>
      <StepUpDialog open={stepUp !== null} onClose={() => setStepUp(null)} onSuccess={() => { const id = stepUp; setStepUp(null); if (id) void remove(id); }} />
    </div>
  );
}
