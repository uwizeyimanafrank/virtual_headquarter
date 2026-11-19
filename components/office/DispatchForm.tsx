"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminDispatch } from "@/lib/admin-dispatches";
import { DISPATCH_KINDS } from "@/lib/dispatches";
import { Uploader } from "@/components/office/Uploader";

const field = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
// <input type="datetime-local"> works in the visitor's local time; the server wants an exact moment, so convert both ways.
const toLocal = (iso: string) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

/** Create or edit one dispatch. `item` = null means a new one. */
export function DispatchForm({ item, onDone, onCancel }: { item: AdminDispatch | null; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [text, setText] = useState(item?.text ?? "");
  const [kind, setKind] = useState(item?.kind ?? "note");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [video, setVideo] = useState(item?.video ?? "");
  const [date, setDate] = useState(item?.date ?? new Date().toISOString().slice(0, 10));
  const [pinned, setPinned] = useState(item?.pinned ?? false);
  const [publishAt, setPublishAt] = useState(toLocal(item?.publishAt ?? ""));
  const [expireAt, setExpireAt] = useState(toLocal(item?.expireAt ?? ""));
  const [published, setPublished] = useState(item?.published ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);
    const body = { title, text, kind, imageUrl, video, date, pinned, publishAt: toIso(publishAt), expireAt: toIso(expireAt), published };
    try {
      await api(item ? `/api/admin/dispatches/${item.id}` : "/api/admin/dispatches", { method: item ? "PATCH" : "POST", body: JSON.stringify(body) });
      onDone();
    } catch (err) {
      const issues = err instanceof ApiError ? (err.data as { issues?: { path: string; message: string }[] } | null)?.issues : undefined;
      setError(issues?.length ? issues.map((i) => `${i.path}: ${i.message}`).join(". ") : err instanceof ApiError ? err.message : "Could not save.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="mb-6 space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-medium">{item ? "Edit dispatch" : "New dispatch"}</h2>
      <label className="block text-sm">Title<input className={field} value={title} maxLength={120} required onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block text-sm">Short text<textarea className={field} rows={3} value={text} maxLength={600} onChange={(e) => setText(e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Kind
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>{DISPATCH_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        </label>
        <label className="block text-sm">Date shown<input type="date" className={field} value={date} required onChange={(e) => setDate(e.target.value)} /></label>
        <label className="block text-sm">Show from (optional)<input type="datetime-local" className={field} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} /></label>
        <label className="block text-sm">Hide from (optional)<input type="datetime-local" className={field} value={expireAt} onChange={(e) => setExpireAt(e.target.value)} /></label>
      </div>
      <div className="text-sm"><p className="mb-1">Picture (optional)</p><Uploader folder="dispatch" value={imageUrl} onChange={setImageUrl} /></div>
      <label className="block text-sm">Video link (optional, Cloudinary only)<input className={field} value={video} maxLength={500} onChange={(e) => setVideo(e.target.value)} /></label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Pinned (stays on top)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Published</label>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
