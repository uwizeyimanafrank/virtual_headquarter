"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaseVideo } from "@/components/museum/CaseVideo";
import { TYPE_LABELS } from "@/lib/item-types";
import { caseHash, neighbour, panelImages } from "@/lib/halls";
import { thumb } from "@/lib/media";
import type { MuseumItemData } from "@/lib/museum";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, video[controls], [tabindex]:not([tabindex="-1"])';
const isWebLink = (s: string) => /^https?:\/\/\S+$/i.test(s);

type Props = {
  items: readonly MuseumItemData[];
  openId: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  returnFocusTo: HTMLElement | null;
};

/**
 * The floating panel of the Glass Cases hall: big picture (or a small carousel), the full story, skills, links, previous and next,
 * and a link that opens straight on this piece. Escape closes, Tab stays inside, the page behind does not scroll,
 * and focus returns to the card that opened it.
 */
export function DetailPanel({ items, openId, onClose, onNavigate, returnFocusTo }: Props) {
  const item = items.find((i) => i.id === openId) ?? null;
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
    // Re-run only when the panel opens or closes, not when moving between pieces.
  }, [item === null, returnFocusTo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item || typeof document === "undefined") return null;
  const prev = neighbour(items, item.id, -1);
  const next = neighbour(items, item.id, 1);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !box.current) return;
    const els = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (els.length === 0) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-md sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={onKeyDown}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="case-panel-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-bg/85 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-3xl">
        <PanelBody key={item.id} item={item} prev={prev?.id ?? null} next={next?.id ?? null} onNavigate={onNavigate} onClose={onClose} closeRef={closeBtn} />
      </div>
    </div>,
    document.body,
  );
}

function PanelBody({ item, prev, next, onNavigate, onClose, closeRef }: { item: MuseumItemData; prev: string | null; next: string | null; onNavigate: (id: string) => void; onClose: () => void; closeRef: React.RefObject<HTMLButtonElement | null> }) {
  const images = panelImages(item);
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}${caseHash(item.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <>
      {images.length > 0 && (
        <div className="relative">
          {/* Addresses are checked when saved (Cloudinary or bundled sample only). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(images[index], 1400)} alt={images.length > 1 ? `${item.title}, picture ${index + 1} of ${images.length}` : item.title} className="max-h-[22rem] w-full rounded-t-3xl object-cover" />
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous picture" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-bg/70 px-3 py-2 backdrop-blur">‹</button>
              <button type="button" onClick={() => go(1)} aria-label="Next picture" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-bg/70 px-3 py-2 backdrop-blur">›</button>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-bg/70 px-3 py-1 text-xs backdrop-blur" aria-hidden="true">{index + 1} / {images.length}</p>
            </>
          )}
        </div>
      )}
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">{TYPE_LABELS[item.type]} · {item.date}</p>
            <h2 id="case-panel-title" className="mt-1 text-2xl font-semibold">{item.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-surface-strong">Close</button>
        </div>
        {item.video && <CaseVideo src={item.video} title={item.title} />}
        {item.description && <p className="whitespace-pre-wrap leading-relaxed text-muted">{item.description}</p>}
        {item.howIEarnedIt && (
          <div>
            <h3 className="text-sm font-medium">{item.type === "certificate" ? "How I earned it" : "The story"}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.howIEarnedIt}</p>
          </div>
        )}
        {item.skills.length > 0 && <ul aria-label="Skills" className="flex flex-wrap gap-1.5">{item.skills.map((s) => <li key={s} className="rounded-full border border-line px-2.5 py-1 text-xs">{s}</li>)}</ul>}
        <div className="flex flex-wrap items-center gap-3">
          {isWebLink(item.link) && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-bg">
              {item.type === "certificate" ? "Verify or view" : "Open link"} <span aria-hidden="true">↗</span>
            </a>
          )}
          <button type="button" onClick={share} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-surface-strong">Copy share link</button>
          <span role="status" className="text-xs text-muted">{copied ? "Link copied" : ""}</span>
        </div>
        {(prev || next) && (
          <div className="flex justify-between gap-3 border-t border-line pt-4 text-sm">
            <button type="button" disabled={!prev} onClick={() => prev && onNavigate(prev)} className="rounded-full border border-line px-4 py-2 disabled:opacity-40">← Previous piece</button>
            <button type="button" disabled={!next} onClick={() => next && onNavigate(next)} className="rounded-full border border-line px-4 py-2 disabled:opacity-40">Next piece →</button>
          </div>
        )}
      </div>
    </>
  );
}
