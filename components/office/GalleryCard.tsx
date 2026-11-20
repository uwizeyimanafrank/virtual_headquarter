"use client";
import { useState } from "react";
import type { AdminAlbum, AdminGalleryImage } from "@/lib/admin-gallery";
import { thumb } from "@/lib/media";

const field = "w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent";
const small = "rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong disabled:opacity-40";

type Props = {
  image: AdminGalleryImage; albums: AdminAlbum[]; index: number; count: number;
  onPatch: (id: string, change: Partial<Pick<AdminGalleryImage, "alt" | "caption" | "album" | "takenDate" | "published">>) => Promise<void>;
  onDelete: (id: string) => void; onMove: (from: number, to: number) => void;
  dragFrom: number | null; setDragFrom: (i: number | null) => void;
};

/** One picture in the manager: reorder (drag the handle, or the arrow buttons for phones and keyboards), edit text, publish, delete. */
export function GalleryCard({ image, albums, index, count, onPatch, onDelete, onMove, dragFrom, setDragFrom }: Props) {
  const [alt, setAlt] = useState(image.alt);
  const [caption, setCaption] = useState(image.caption);
  const [takenDate, setTakenDate] = useState(image.takenDate);
  const [busy, setBusy] = useState(false);
  const dirty = alt !== image.alt || caption !== image.caption || takenDate !== image.takenDate;

  async function save() {
    setBusy(true);
    try { await onPatch(image.id, { alt, caption, takenDate }); } finally { setBusy(false); }
  }

  return (
    <li
      onDragOver={(e) => { if (dragFrom !== null) e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) onMove(dragFrom, index); setDragFrom(null); }}
      className={`flex gap-3 rounded-xl border bg-surface p-3 ${dragFrom === index ? "border-accent opacity-60" : "border-line"}`}
    >
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button" draggable aria-label={`Drag to reorder picture ${index + 1}`} title="Drag to reorder"
          onDragStart={(e) => { setDragFrom(index); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", image.id); const li = (e.currentTarget as HTMLElement).closest("li"); if (li) e.dataTransfer.setDragImage(li, 20, 20); }}
          onDragEnd={() => setDragFrom(null)}
          className="cursor-grab rounded-lg border border-line px-2 py-1 text-sm active:cursor-grabbing"
        >⠿</button>
        <button type="button" className={small} disabled={index === 0} aria-label="Move earlier" onClick={() => onMove(index, index - 1)}>↑</button>
        <button type="button" className={small} disabled={index === count - 1} aria-label="Move later" onClick={() => onMove(index, index + 1)}>↓</button>
      </div>
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(image.imageUrl, 240)} alt={image.alt} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input className={field} value={alt} maxLength={200} required aria-label="Alt text" placeholder="Alt text (required)" onChange={(e) => setAlt(e.target.value)} />
        <input className={field} value={caption} maxLength={200} aria-label="Caption" placeholder="Caption (optional)" onChange={(e) => setCaption(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className={`${field} w-auto`} value={takenDate} aria-label="Date taken" onChange={(e) => setTakenDate(e.target.value)} />
          <select className={`${field} w-auto`} value={image.album} aria-label="Album" onChange={(e) => void onPatch(image.id, { album: e.target.value })}>
            <option value="">No album</option>
            {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <button type="button" className={small} onClick={() => void onPatch(image.id, { published: !image.published })}>{image.published ? "Unpublish" : "Publish"}</button>
          <span className={`text-xs ${image.published ? "text-accent" : "text-muted"}`}>{image.published ? "published" : "draft"}</span>
          {dirty && <button type="button" disabled={busy || !alt.trim()} className={`${small} border-accent text-accent`} onClick={save}>{busy ? "Saving..." : "Save text"}</button>}
          <button type="button" className={`${small} ml-auto text-red-300`} onClick={() => window.confirm("Delete this picture? This cannot be undone.") && onDelete(image.id)}>Delete</button>
        </div>
      </div>
    </li>
  );
}
