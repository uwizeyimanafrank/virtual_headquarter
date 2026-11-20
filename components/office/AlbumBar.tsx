"use client";
import { useState } from "react";
import type { AdminAlbum, AdminGalleryImage } from "@/lib/admin-gallery";

const field = "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent";
const small = "rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-surface-strong disabled:opacity-40";

/** Choose what the list shows (all, no album, or one album) and create, rename or delete albums. */
export function AlbumBar({ albums, images, view, setView, onCreate, onRename, onDelete }: {
  albums: AdminAlbum[]; images: AdminGalleryImage[]; view: string; setView: (v: string) => void;
  onCreate: (title: string) => Promise<void>; onRename: (id: string, title: string) => Promise<void>; onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const current = albums.find((a) => a.id === view);
  const count = (v: string) => (v === "all" ? images.length : v === "none" ? images.filter((i) => !i.album).length : images.filter((i) => i.album === v).length);

  return (
    <div className="mb-4 space-y-3">
      <div role="group" aria-label="Show pictures from" className="flex flex-wrap gap-2">
        {[{ id: "all", title: "All" }, { id: "none", title: "No album" }, ...albums].map((a) => (
          <button key={a.id} type="button" aria-pressed={view === a.id} onClick={() => setView(a.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${view === a.id ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}>
            {a.title} <span className="text-xs opacity-70">{count(a.id)}</span>
          </button>
        ))}
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); if (title.trim()) { await onCreate(title.trim()); setTitle(""); } }}>
        <input className={field} value={title} maxLength={80} placeholder="New album title" aria-label="New album title" onChange={(e) => setTitle(e.target.value)} />
        <button className={small} disabled={!title.trim()}>Add album</button>
        {current && (
          <>
            <button type="button" className={small} onClick={() => { const t = window.prompt("Album title", current.title)?.trim(); if (t) void onRename(current.id, t); }}>Rename “{current.title}”</button>
            <button type="button" className={`${small} text-red-300`} onClick={() => window.confirm(`Delete the album “${current.title}”? Its pictures are kept and move to “No album”.`) && void onDelete(current.id)}>Delete album</button>
          </>
        )}
      </form>
    </div>
  );
}
