"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StepUpDialog } from "@/components/office/StepUpDialog";

type Msg = { id: string; name: string; email: string; body: string; read: boolean; archived: boolean; createdAt: string };
const small = "rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong";

/** Messages sent from the public Connect page. Shown as plain text, never as HTML. */
export function MessagesInbox() {
  const [archived, setArchived] = useState(false);
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ messages: Msg[]; unread: number }>(`/api/admin/messages?archived=${archived ? 1 : 0}`)
      .then((r) => { if (alive) { setMsgs(r.messages); setUnread(r.unread); } })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, [archived, tick]);
  const reload = () => setTick((t) => t + 1);

  async function patch(id: string, body: object) {
    setError("");
    try { await api(`/api/admin/messages/${id}`, { method: "PATCH", body: JSON.stringify(body) }); reload(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); }
  }
  async function remove(id: string) {
    setError("");
    try { await api(`/api/admin/messages/${id}`, { method: "DELETE" }); reload(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setStepUp(id);
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2" role="tablist">
        <button role="tab" aria-selected={!archived} onClick={() => { setMsgs(null); setArchived(false); }} className={`rounded-lg px-3 py-1.5 text-sm ${!archived ? "bg-surface-strong text-accent" : "text-muted"}`}>Inbox{unread > 0 && ` (${unread} new)`}</button>
        <button role="tab" aria-selected={archived} onClick={() => { setMsgs(null); setArchived(true); }} className={`rounded-lg px-3 py-1.5 text-sm ${archived ? "bg-surface-strong text-accent" : "text-muted"}`}>Archive</button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {!msgs && !error && <p className="text-sm text-muted">Loading...</p>}
      {msgs && msgs.length === 0 && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">{archived ? "The archive is empty." : "No messages yet. They appear here when someone writes from the Connect page."}</p>}
      <ul className="space-y-3">
        {msgs?.map((m) => (
          <li key={m.id} className={`rounded-xl border bg-surface p-4 ${m.read ? "border-line" : "border-accent/60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{!m.read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" aria-label="unread" />}{m.name} <span className="font-normal text-muted">&lt;{m.email}&gt;</span></p>
              <time className="text-xs text-muted" dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString()}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.body}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button className={small} onClick={() => patch(m.id, { read: !m.read })}>{m.read ? "Mark unread" : "Mark read"}</button>
              <button className={small} onClick={() => patch(m.id, { archived: !m.archived, read: true })}>{m.archived ? "Move to inbox" : "Archive"}</button>
              <button className={`${small} text-red-300`} onClick={() => window.confirm("Delete this message? This cannot be undone.") && remove(m.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <StepUpDialog open={stepUp !== null} onClose={() => setStepUp(null)} onSuccess={() => { const id = stepUp; setStepUp(null); if (id) void remove(id); }} />
    </div>
  );
}
