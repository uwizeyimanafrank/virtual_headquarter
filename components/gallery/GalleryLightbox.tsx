"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { PublicPhoto } from "@/lib/gallery";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SWIPE_MIN = 50; // pixels sideways before it counts as a swipe

/**
 * Full-screen viewer. Keyboard: Escape closes, Left/Right (and Home/End) change picture, Tab stays inside.
 * Touch: swipe left or right. The page behind does not scroll and focus returns to the picture you opened it from.
 * `index` null = closed. The next and previous pictures are fetched ahead so moving on feels instant.
 */
export function GalleryLightbox({ photos, index, onClose, onIndex, returnFocusTo }: { photos: readonly PublicPhoto[]; index: number | null; onClose: () => void; onIndex: (i: number) => void; returnFocusTo: HTMLElement | null }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null && photos[index] !== undefined;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; returnFocusTo?.focus(); };
  }, [open, returnFocusTo]);

  useEffect(() => {
    if (index === null) return;
    for (const n of [index - 1, index + 1]) if (photos[n]) new Image().src = photos[n].full; // fetch the neighbours ahead
  }, [index, photos]);

  if (!open || typeof document === "undefined") return null;
  const i = index as number;
  const photo = photos[i];
  const go = (to: number) => onIndex((to + photos.length) % photos.length); // wraps around

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); return; }
    if (e.key === "Home") { e.preventDefault(); onIndex(0); return; }
    if (e.key === "End") { e.preventDefault(); onIndex(photos.length - 1); return; }
    if (e.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  const btn = "rounded-full border border-white/30 bg-black/40 px-4 py-2 text-sm text-white hover:bg-black/60";
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md" onKeyDown={onKeyDown}>
      <div
        ref={box} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col"
        onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={(e) => {
          const s = touch.current; touch.current = null;
          if (!s || photos.length < 2) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x, dy = t.clientY - s.y;
          if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? i + 1 : i - 1); // swipe left = next
        }}
      >
        <div className="flex items-center justify-between gap-3 p-3 text-white">
          <p id={titleId} aria-live="polite" className="text-sm">Picture {i + 1} of {photos.length}</p>
          <button ref={closeBtn} type="button" onClick={onClose} className={btn}>Close</button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          {photos.length > 1 && <button type="button" aria-label="Previous picture" onClick={() => go(i - 1)} className={`${btn} absolute left-2 z-10 hidden sm:block`}>&larr;</button>}
          {/* Resized link made by Cloudinary, never the stored original. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={photo.id} src={photo.full} alt={photo.alt} draggable={false} className="max-h-full max-w-full rounded-md object-contain" style={photo.blur ? { backgroundImage: `url(${photo.blur})`, backgroundSize: "cover" } : undefined} />
          {photos.length > 1 && <button type="button" aria-label="Next picture" onClick={() => go(i + 1)} className={`${btn} absolute right-2 z-10 hidden sm:block`}>&rarr;</button>}
        </div>
        <div className="min-h-16 p-4 text-center text-white">
          {photo.caption && <p className="text-base">{photo.caption}</p>}
          {photo.takenDate && <p className="text-xs text-white/60"><time dateTime={photo.takenDate}>{new Date(photo.takenDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time></p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
