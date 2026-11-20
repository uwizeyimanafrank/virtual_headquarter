"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminAlbum, AdminGalleryImage } from "@/lib/admin-gallery";
import { inView, moveItem } from "@/lib/gallery";
import { AlbumBar } from "@/components/office/AlbumBar";
import { GalleryCard } from "@/components/office/GalleryCard";
import { GalleryUpload } from "@/components/office/GalleryUpload";
import { StepUpDialog } from "@/components/office/StepUpDialog";

type Data = { images: AdminGalleryImage[]; albums: AdminAlbum[] };

/** The gallery in the Office: upload many pictures, reorder, edit text, albums, publish. */
export function GalleryManager() {
  const [data, setData] = useState<Data | null>(null);
  const [tick, setTick] = useState(0);
  const [view, setView] = useState("all");
  const [error, setError] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [stepUp, setStepUp] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<Data>("/api/admin/gallery").then((d) => alive && setData(d)).catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, [tick]);
  const reload = () => setTick((t) => t + 1);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try { await fn(); reload(); } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); }
  };

  if (!data) return <p className="text-sm text-muted">{error || "Loading..."}</p>;
  const sorted = [...data.images].sort((a, b) => a.order - b.order);
  const shown = inView(sorted, view);

  async function move(from: number, to: number) {
    const ids = moveItem(shown, from, to).map((i) => i.id);
    if (ids.every((id, n) => id === shown[n].id)) return;
    setData((d) => d && { ...d, images: d.images.map((i) => (ids.includes(i.id) ? { ...i, order: ids.indexOf(i.id) } : i)) }); // show it at once
    try { await api("/api/admin/gallery/order", { method: "PUT", body: JSON.stringify({ ids }) }); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not save the order."); reload(); }
  }

  async function removeImage(id: string) {
    setError("");
    try { await api(`/api/admin/gallery/${id}`, { method: "DELETE" }); reload(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setStepUp(id); // needs a fresh authenticator code first
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <AlbumBar
        albums={data.albums} images={data.images} view={view} setView={setView}
        onCreate={(title) => run(() => api("/api/admin/albums", { method: "POST", body: JSON.stringify({ title }) }))}
        onRename={(id, title) => run(() => api(`/api/admin/albums/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }))}
        onDelete={(id) => run(async () => { await api(`/api/admin/albums/${id}`, { method: "DELETE" }); setView("none"); })}
      />
      <GalleryUpload albumId={data.albums.some((a) => a.id === view) ? view : ""} onSaved={reload} />
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {shown.length === 0 && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">No pictures here yet.</p>}
      <ul className="space-y-2">
        {shown.map((img, n) => (
          <GalleryCard
            key={img.id} image={img} albums={data.albums} index={n} count={shown.length}
            onPatch={(id, change) => run(() => api(`/api/admin/gallery/${id}`, { method: "PATCH", body: JSON.stringify(change) }))}
            onDelete={removeImage} onMove={move} dragFrom={dragFrom} setDragFrom={setDragFrom}
          />
        ))}
      </ul>
      <StepUpDialog open={stepUp !== null} onClose={() => setStepUp(null)} onSuccess={() => { const id = stepUp; setStepUp(null); if (id) void removeImage(id); }} />
    </div>
  );
}
