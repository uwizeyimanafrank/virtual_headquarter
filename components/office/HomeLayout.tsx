"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { moveBlock } from "@/lib/home-blocks";

type Field = { name: string; label: string; max: number; long?: boolean; default: string };
type Block = { key: string; label: string; description: string; required: boolean; ready: boolean; enabled: boolean; content: Record<string, string>; fields: Field[] };

const inputCls = "w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent";
const btnCls = "rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-bg disabled:opacity-50";
const ghostCls = "rounded-xl border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40";

/** Office > Home layout: which Home blocks show, in what order, and their words. */
export function HomeLayout() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [sureReset, setSureReset] = useState(false);

  useEffect(() => {
    api<{ blocks: Block[] }>("/api/admin/home-blocks").then((r) => setBlocks(r.blocks)).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the layout."));
  }, []);

  const change = (fn: (b: Block[]) => Block[]) => { setBlocks((b) => (b ? fn(b) : b)); setDirty(true); setMsg(""); };
  const setField = (key: string, name: string, value: string) => change((list) => list.map((b) => (b.key === key ? { ...b, content: { ...b.content, [name]: value } } : b)));

  async function save() {
    if (!blocks) return;
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await api<{ blocks: Block[] }>("/api/admin/home-blocks", { method: "PUT", body: JSON.stringify({ blocks: blocks.map((b) => ({ key: b.key, enabled: b.enabled, content: b.content })) }) });
      setBlocks(r.blocks); setDirty(false); setMsg("Saved. Your Home page is updated.");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save."); } finally { setBusy(false); }
  }

  async function reset() {
    setBusy(true); setError(""); setMsg("");
    try {
      const r = await api<{ blocks: Block[] }>("/api/admin/home-blocks", { method: "DELETE" });
      setBlocks(r.blocks); setDirty(false); setSureReset(false); setMsg("Back to the built-in layout.");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not reset."); } finally { setBusy(false); }
  }

  if (error && !blocks) return <p role="alert" className="text-sm text-red-400">{error}</p>;
  if (!blocks) return <p role="status" className="text-sm text-muted">Loading...</p>;

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {blocks.map((b, i) => (
          <li key={b.key} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-line text-sm text-muted" aria-hidden="true">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.label}</p>
                <p className="text-sm text-muted">{b.description}</p>
                <p className="mt-1 flex flex-wrap gap-2 text-xs">
                  {b.required && <span className="rounded-full border border-line px-2 py-0.5 text-muted">Always on</span>}
                  {!b.ready && <span className="rounded-full border border-amber-400/50 px-2 py-0.5 text-amber-300">Coming soon (hidden until it is built)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className={ghostCls} onClick={() => change((l) => moveBlock(l, b.key, -1))} disabled={i === 0} aria-label={`Move ${b.label} up`}>Up</button>
                <button className={ghostCls} onClick={() => change((l) => moveBlock(l, b.key, 1))} disabled={i === blocks.length - 1} aria-label={`Move ${b.label} down`}>Down</button>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={b.enabled} disabled={b.required} onChange={(e) => change((l) => l.map((x) => (x.key === b.key ? { ...x, enabled: e.target.checked } : x)))} aria-label={`Show ${b.label}`} />
                  Show
                </label>
                {b.fields.length > 0 && <button className={ghostCls} onClick={() => setOpen(open === b.key ? null : b.key)} aria-expanded={open === b.key} aria-label={`Edit the text of ${b.label}`}>Edit text</button>}
              </div>
            </div>
            {open === b.key && (
              <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                {b.fields.map((f) => (
                  <label key={f.name} className={`block text-sm ${f.long ? "sm:col-span-2" : ""}`}>
                    {f.label}
                    {f.long
                      ? <textarea className={`${inputCls} mt-1 min-h-20`} value={b.content[f.name] ?? ""} maxLength={f.max} onChange={(e) => setField(b.key, f.name, e.target.value)} placeholder={f.default} />
                      : <input className={`${inputCls} mt-1`} value={b.content[f.name] ?? ""} maxLength={f.max} onChange={(e) => setField(b.key, f.name, e.target.value)} placeholder={f.default} />}
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {msg && <p role="status" className="text-sm text-emerald-400">{msg}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnCls} onClick={() => void save()} disabled={busy || !dirty}>{busy ? "Saving..." : "Save layout"}</button>
        {dirty && <span className="text-sm text-amber-300">You have unsaved changes.</span>}
        {!sureReset
          ? <button className={ghostCls} onClick={() => setSureReset(true)} disabled={busy}>Reset to built-in layout</button>
          : <span className="flex gap-2"><button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white" onClick={() => void reset()}>Yes, reset everything</button><button className={ghostCls} onClick={() => setSureReset(false)}>Keep</button></span>}
      </div>
    </div>
  );
}
