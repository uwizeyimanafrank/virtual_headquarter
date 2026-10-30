"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { thumb } from "@/lib/media";
import type { MuseumEntry } from "@/lib/museum-chapters";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
const isWebLink = (s: string) => /^https?:\/\/\S+$/i.test(s);

/**
 * Glass pop-up with the story behind a piece. Keyboard friendly: Escape closes, Tab stays inside,
 * the page behind does not scroll, and focus goes back to the card you opened it from.
 */
export function ItemModal({ entry, onClose, returnFocusTo }: { entry: MuseumEntry | null; onClose: () => void; returnFocusTo: HTMLElement | null }) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!entry) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [entry, returnFocusTo]);

  if (!entry || typeof document === "undefined") return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKeyDown}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-bg/80 shadow-2xl backdrop-blur-xl sm:rounded-3xl">
        {entry.mediaUrl && (
          // Address checked when saved (Cloudinary or bundled sample only).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(entry.mediaUrl, 1100)} alt={entry.title} className="max-h-72 w-full rounded-t-3xl object-cover" />
        )}
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-accent">{entry.type} &middot; {entry.date}</p>
              <h2 id={titleId} className="mt-1 text-2xl font-semibold">{entry.title}</h2>
            </div>
            <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-strong">Close</button>
          </div>
          {entry.description && <p className="whitespace-pre-wrap leading-relaxed text-muted">{entry.description}</p>}
          {entry.howIEarnedIt && (
            <div>
              <h3 className="text-sm font-medium">{entry.type === "certificate" ? "How I earned it" : "The story"}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{entry.howIEarnedIt}</p>
            </div>
          )}
          {entry.skills.length > 0 && <p className="flex flex-wrap gap-1.5">{entry.skills.map((s) => <span key={s} className="rounded-full border border-line px-2.5 py-1 text-xs">{s}</span>)}</p>}
          {isWebLink(entry.link) && (
            <a href={entry.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-bg">
              {entry.type === "certificate" ? "Verify or view" : "Open link"} <span aria-hidden>&nearr;</span>
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
