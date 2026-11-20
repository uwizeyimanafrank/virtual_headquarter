"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { runLimited } from "@/lib/gallery";
import { thumb } from "@/lib/media";
import { IMAGE_TYPES, uploadImage } from "@/lib/upload-image";

type Pending = { key: string; name: string; status: "uploading" | "ready" | "failed"; progress: number; url: string; alt: string; caption: string; error: string };
const field = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent";
const MAX_AT_ONCE = 20; // one save sends up to 20 pictures
const PARALLEL = 3; // uploads running at the same time

/** Pick or drop many pictures. They upload (3 at a time), then each needs alt text before everything is saved in one go. */
export function GalleryUpload({ albumId, onSaved }: { albumId: string; onSaved: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const patch = (key: string, change: Partial<Pending>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...change } : i)));

  async function add(files: File[]) {
    setError("");
    const room = MAX_AT_ONCE - items.length;
    const chosen = files.slice(0, Math.max(0, room));
    if (files.length > chosen.length) setError(`Up to ${MAX_AT_ONCE} pictures at a time. The extra ones were left out.`);
    const fresh: Pending[] = chosen.map((f, n) => ({ key: `${Date.now()}-${n}-${f.name}`, name: f.name, status: "uploading", progress: 0, url: "", alt: "", caption: "", error: "" }));
    setItems((list) => [...list, ...fresh]);
    await runLimited(chosen, PARALLEL, async (file, n) => {
      const key = fresh[n].key;
      try {
        const url = await uploadImage(file, "gallery", (progress) => patch(key, { progress }));
        patch(key, { status: "ready", url, progress: 100 });
      } catch (e) {
        patch(key, { status: "failed", error: e instanceof Error ? e.message : "Upload failed." });
      }
    });
  }

  const ready = items.filter((i) => i.status === "ready");
  const busy = items.some((i) => i.status === "uploading");
  const missingAlt = ready.some((i) => !i.alt.trim());

  async function save() {
    setError(""); setSaving(true);
    try {
      await api("/api/admin/gallery", { method: "POST", body: JSON.stringify({ images: ready.map((i) => ({ imageUrl: i.url, alt: i.alt, caption: i.caption, album: albumId || null, published })) }) });
      setItems((list) => list.filter((i) => i.status === "failed")); // keep failed ones visible so they can be removed or retried by choosing again
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    } finally { setSaving(false); }
  }

  return (
    <div className="mb-8 rounded-2xl border border-line bg-surface p-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void add(Array.from(e.dataTransfer.files)); }}
        className={`flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm transition ${over ? "border-accent bg-surface-strong" : "border-line"}`}
      >
        <p className="text-muted">Drop pictures here (JPG, PNG or WebP, up to {MAX_AT_ONCE} at a time). Hidden location data is removed on this device first.</p>
        <button type="button" className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface-strong" onClick={() => input.current?.click()}>Choose pictures</button>
        <input ref={input} type="file" multiple accept={IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => { void add(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.key} className="flex gap-3 rounded-xl border border-line p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-strong">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.url && <img src={thumb(i.url, 200)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs text-muted">{i.name}</p>
                {i.status === "uploading" && <div className="h-2 overflow-hidden rounded-full bg-surface-strong" role="progressbar" aria-label={`Uploading ${i.name}`} aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-accent transition-all" style={{ width: `${i.progress}%` }} /></div>}
                {i.status === "failed" && <p role="alert" className="text-sm text-red-400">{i.error}</p>}
                {i.status === "ready" && (
                  <>
                    <input className={field} value={i.alt} maxLength={200} placeholder="Alt text (required): what is in the picture?" aria-label={`Alt text for ${i.name}`} onChange={(e) => patch(i.key, { alt: e.target.value })} />
                    <input className={field} value={i.caption} maxLength={200} placeholder="Caption (optional)" aria-label={`Caption for ${i.name}`} onChange={(e) => patch(i.key, { caption: e.target.value })} />
                  </>
                )}
              </div>
              <button type="button" className="self-start rounded-lg border border-line px-2 py-1 text-xs" onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
      {ready.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Publish right away</label>
          <button type="button" disabled={saving || busy || missingAlt} onClick={save} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50">
            {saving ? "Saving..." : `Save ${ready.length} picture${ready.length === 1 ? "" : "s"}`}
          </button>
          {missingAlt && <p className="text-xs text-amber-300">Every picture needs alt text before saving.</p>}
          {busy && <p className="text-xs text-muted">Still uploading...</p>}
        </div>
      )}
    </div>
  );
}
