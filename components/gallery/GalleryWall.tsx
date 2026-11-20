"use client";
import "./gallery.css";
import { useState, type CSSProperties } from "react";
import { shapeOf, tiltOf, type GalleryChapter } from "@/lib/gallery";
import { GalleryLightbox } from "@/components/gallery/GalleryLightbox";

/** The wall: albums as chapters, each a set of polaroids (masonry on phones). Click or press Enter on a picture to open the viewer. */
export function GalleryWall({ chapters }: { chapters: GalleryChapter[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [from, setFrom] = useState<HTMLElement | null>(null);
  const all = chapters.flatMap((c) => c.photos); // the viewer walks through every picture in wall order
  const onlyLoose = chapters.length === 1 && chapters[0].id === "";
  let n = 0; // running position of a picture across all chapters

  return (
    <div className="space-y-14">
      {chapters.length > 1 && (
        <nav aria-label="Albums" className="flex flex-wrap justify-center gap-2">
          {chapters.map((c) => <a key={c.id || "more"} href={`#album-${c.id || "more"}`} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-fg">{c.title || "More pictures"}</a>)}
        </nav>
      )}
      {chapters.map((c) => (
        <section key={c.id || "more"} id={`album-${c.id || "more"}`} aria-labelledby={onlyLoose ? undefined : `h-${c.id || "more"}`} aria-label={onlyLoose ? "Pictures" : undefined} className="scroll-mt-20">
          {!onlyLoose && (
            <header className="mb-6 text-center">
              <h2 id={`h-${c.id || "more"}`} className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.title || "More pictures"}</h2>
              {c.description && <p className="mx-auto mt-2 max-w-xl text-muted">{c.description}</p>}
            </header>
          )}
          <ul className="gallery-wall">
            {c.photos.map((p) => {
              const index = n++;
              return (
                <li key={p.id} className="gallery-card rounded-md border border-line bg-surface p-2 pb-3 shadow-lg" style={{ "--tilt": tiltOf(p.id) } as CSSProperties}>
                  <button type="button" className="block w-full overflow-hidden rounded-sm text-left" onClick={(e) => { setFrom(e.currentTarget); setOpen(index); }}>
                    {/* The blurred preview is the background, so the space is filled while the real picture loads. */}
                    <span className="block w-full bg-surface-strong bg-cover bg-center" style={{ aspectRatio: shapeOf(p.id), backgroundImage: p.blur ? `url(${p.blur})` : undefined }}>
                      {/* Resized links made by Cloudinary or bundled drawings, never the stored original. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt={p.alt} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
                    </span>
                  </button>
                  {p.caption && <p className="mt-2 px-1 text-center text-sm text-muted">{p.caption}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <GalleryLightbox photos={all} index={open} onClose={() => setOpen(null)} onIndex={setOpen} returnFocusTo={from} />
    </div>
  );
}
