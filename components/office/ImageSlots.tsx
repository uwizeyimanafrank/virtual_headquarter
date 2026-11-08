"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { thumb } from "@/lib/media";
import { Uploader } from "@/components/office/Uploader";

type Custom = { url: string; alt: string; focal: { x: number; y: number }; credit: string; license: string; kind: string };
type Row = { key: string; label: string; page: string; section: string; where: string; aspect: string; minWidth: number; defaultSrc: string; decorative: boolean; custom: Custom | null };

const inputCls = "w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent";
const btnCls = "rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50";
const ghostCls = "rounded-xl border border-line px-4 py-2 text-sm hover:border-accent disabled:opacity-50";

const ratioOf = (a: string) => { const [x, y] = a.split(":").map(Number); return y ? x / y : 1; };
const show = (src: string, w: number) => thumb(src, w);

/** Office > Images: every picture slot of the public site, with where it shows, and a way to replace it. */
export function ImageSlots() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [library, setLibrary] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ slots: Row[]; library: string[] }>("/api/admin/slots")
      .then((r) => { setRows(r.slots); setLibrary(r.library); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the images."));
  }, []);

  const patch = (key: string, custom: Custom | null) => setRows((list) => list && list.map((r) => (r.key === key ? { ...r, custom } : r)));

  if (error && !rows) return <p role="alert" className="text-sm text-red-400">{error}</p>;
  if (!rows) return <p className="text-sm text-muted" role="status">Loading...</p>;

  const pages = rows.reduce<string[]>((acc, r) => (acc.includes(r.page) ? acc : [...acc, r.page]), []);
  return (
    <div className="space-y-8">
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {pages.map((page) => (
        <section key={page} aria-label={page}>
          <h2 className="text-lg font-semibold">{page}</h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {rows.filter((r) => r.page === page).map((r) => (
              <li key={r.key} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex gap-4">
                  <div className="w-28 shrink-0 overflow-hidden rounded-lg bg-bg" style={{ aspectRatio: String(ratioOf(r.aspect)) }}>
                    {/* The address is checked on the server (our Cloudinary or bundled art only). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={show(r.custom?.url ?? r.defaultSrc, 300)} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${r.custom?.focal.x ?? 50}% ${r.custom?.focal.y ?? 50}%` }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.label}</p>
                    <p className="mt-1 text-sm text-muted">{r.where}</p>
                    <p className="mt-1 text-xs text-muted">Best shape {r.aspect}, at least {r.minWidth}px wide</p>
                    <p className="mt-2"><span className={`rounded-full border px-2.5 py-0.5 text-xs ${r.custom ? "border-accent text-accent" : "border-line text-muted"}`}>{r.custom ? "Your picture" : "Default"}</span></p>
                  </div>
                </div>
                {editing === r.key ? (
                  <Editor
                    row={r}
                    library={library}
                    onCancel={() => setEditing(null)}
                    onSaved={(c) => { patch(r.key, c); setEditing(null); setLibrary((l) => (l.includes(c.url) ? l : [c.url, ...l])); }}
                  />
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className={ghostCls} onClick={() => setEditing(r.key)} aria-label={`Replace ${r.label}`}>Replace</button>
                    {r.custom && <ResetButton label={r.label} onDone={async () => {
                      try { await api(`/api/admin/slots/${r.key}`, { method: "DELETE" }); patch(r.key, null); setError(""); }
                      catch (e) { setError(e instanceof ApiError ? e.message : "Could not reset."); }
                    }} />}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ResetButton({ label, onDone }: { label: string; onDone: () => void }) {
  const [sure, setSure] = useState(false);
  if (!sure) return <button className={ghostCls} onClick={() => setSure(true)} aria-label={`Reset ${label} to default`}>Reset to default</button>;
  return (
    <span className="flex gap-2">
      <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white" onClick={onDone}>Yes, reset</button>
      <button className={ghostCls} onClick={() => setSure(false)}>Keep</button>
    </span>
  );
}

function Editor({ row, library, onSaved, onCancel }: { row: Row; library: string[]; onSaved: (c: Custom) => void; onCancel: () => void }) {
  const c = row.custom;
  const [url, setUrl] = useState(c?.url ?? "");
  const [kind, setKind] = useState(c?.kind === "library" ? "library" : "upload");
  const [focal, setFocal] = useState(c?.focal ?? { x: 50, y: 50 });
  const [alt, setAlt] = useState(c?.alt ?? "");
  const [credit, setCredit] = useState(c?.credit ?? "");
  const [license, setLicense] = useState(c?.license ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publicId, setPublicId] = useState("");
  const needAlt = !row.decorative && !alt.trim();
  const canSave = !!url && !needAlt && !busy;
  const preview = url || row.defaultSrc;

  function pickFocus(e: React.MouseEvent<HTMLDivElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
    setFocal({ x: clamp(((e.clientX - b.left) / b.width) * 100), y: clamp(((e.clientY - b.top) / b.height) * 100) });
  }

  async function importLink() {
    setImporting(true);
    setImportMsg("");
    try {
      const r = await api<{ url: string; publicId: string; sourceUrl: string; host: string }>("/api/admin/slots/import", { method: "POST", body: JSON.stringify({ link }) });
      setUrl(r.url); setKind("import"); setSourceUrl(r.sourceUrl); setPublicId(r.publicId); setLink("");
      if (!credit.trim()) setCredit(`Source: ${r.host}`);
    } catch (e) {
      setImportMsg(e instanceof ApiError ? e.message : "Could not import that picture.");
    } finally { setImporting(false); }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/admin/slots/${row.key}`, { method: "PUT", body: JSON.stringify({ url, alt, focal, credit, license, kind, sourceUrl, publicId }) });
      onSaved({ url, alt, focal, credit, license, kind });
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Could not save.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <Uploader folder="slot" value={url} onChange={(u) => { setUrl(u); setKind("upload"); setSourceUrl(""); setPublicId(""); }} />
      <div>
        <label className="block text-sm font-medium">Or paste an image link
          <span className="mt-1 flex gap-2">
            <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link to the picture (starts with https)" inputMode="url" autoComplete="off" spellCheck={false} />
            <button type="button" className={ghostCls} onClick={() => void importLink()} disabled={!link.trim() || importing}>{importing ? "Importing..." : "Import"}</button>
          </span>
        </label>
        <p className="mt-1 text-xs text-muted">We keep our own copy, so it never breaks. Use free-license pictures (Unsplash, Pexels, Pixabay) and check the license on the original page.</p>
        {importMsg && <p role="alert" className="mt-1 text-sm text-red-400">{importMsg}</p>}
      </div>
      {library.length > 0 && (
        <div>
          <p className="text-sm font-medium">Or use a picture already on your site</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {library.map((u) => (
              <li key={u}>
                <button type="button" onClick={() => { setUrl(u); setKind("library"); setSourceUrl(""); setPublicId(""); }} aria-pressed={url === u} aria-label="Use this picture" className={`block h-14 w-14 overflow-hidden rounded-lg border ${url === u ? "border-accent" : "border-line"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={show(u, 120)} alt="" className="h-full w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-sm font-medium">Focus point <span className="font-normal text-muted">(click the most important part, crops will keep it)</span></p>
        <div role="button" tabIndex={0} aria-label="Focus point preview" onClick={pickFocus}
          onKeyDown={(e) => { const s = 5; if (e.key === "ArrowLeft") setFocal((f) => ({ ...f, x: Math.max(0, f.x - s) })); if (e.key === "ArrowRight") setFocal((f) => ({ ...f, x: Math.min(100, f.x + s) })); if (e.key === "ArrowUp") setFocal((f) => ({ ...f, y: Math.max(0, f.y - s) })); if (e.key === "ArrowDown") setFocal((f) => ({ ...f, y: Math.min(100, f.y + s) })); }}
          className="relative mt-2 w-full max-w-sm cursor-crosshair overflow-hidden rounded-lg border border-line bg-bg" style={{ aspectRatio: String(ratioOf(row.aspect)) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={show(preview, 800)} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} draggable={false} />
          <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-accent/30" style={{ left: `${focal.x}%`, top: `${focal.y}%` }} data-testid="focus-dot" />
        </div>
        <p className="mt-1 text-xs text-muted">Focus: {focal.x}% across, {focal.y}% down</p>
      </div>
      <label className="block text-sm">
        {row.decorative ? "Description (optional, this picture is decoration)" : "Description of the picture (required)"}
        <input className={`${inputCls} mt-1`} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Credit (who made it)<input className={`${inputCls} mt-1`} value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={200} /></label>
        <label className="block text-sm">License note<input className={`${inputCls} mt-1`} value={license} onChange={(e) => setLicense(e.target.value)} maxLength={200} placeholder="e.g. my own photo" /></label>
      </div>
      {needAlt && url && <p className="text-xs text-amber-400">Add a short description so screen readers can read this picture.</p>}
      {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
      <div className="flex gap-2">
        <button className={btnCls} onClick={() => void save()} disabled={!canSave}>{busy ? "Saving..." : "Save picture"}</button>
        <button className={ghostCls} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
