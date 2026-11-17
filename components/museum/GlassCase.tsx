"use client";

import "./glass-case.css";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTilt } from "@/hooks/useTilt";
import { TYPE_LABELS } from "@/lib/item-types";
import { thumb } from "@/lib/media";
import type { MuseumItemData } from "@/lib/museum";

/**
 * One piece behind glass: a reflection, a label plate (type, date, title), a spotlight that follows the pointer,
 * and the description that appears when you lean closer (hover or keyboard focus). On touch screens the text is always
 * shown. With reduced motion there is no tilt and no spotlight. The whole card is one button that opens the detail panel.
 */
export function GlassCase({ item, onOpen }: { item: MuseumItemData; onOpen: (item: MuseumItemData, trigger: HTMLElement) => void }) {
  const { ref, enabled, handlers } = useTilt<HTMLButtonElement>(5);
  const hasHover = useMediaQuery("(hover: hover)");
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    handlers.onPointerMove(e);
    const el = ref.current;
    if (!el || !enabled) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <button
      ref={ref}
      type="button"
      data-reveal={hasHover ? "hover" : "always"}
      onClick={(e) => onOpen(item, e.currentTarget)}
      onPointerMove={move}
      onPointerLeave={handlers.onPointerLeave}
      className={`gc group relative block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-lg shadow-black/25 ${enabled ? "transition-transform duration-150 ease-out will-change-transform" : ""}`}
    >
      {item.mediaUrl ? (
        <img src={thumb(item.mediaUrl, 640)} alt="" loading="lazy" decoding="async" width={640} height={400} className="aspect-[16/10] w-full object-cover" />
      ) : (
        <div aria-hidden="true" className="aspect-[16/10] w-full bg-surface-strong" />
      )}
      <span aria-hidden="true" className="gc-glass pointer-events-none absolute inset-0" />
      {enabled && <span aria-hidden="true" data-testid="spotlight" className="gc-spot pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />}
      <span className="relative block border-t border-line bg-bg/70 px-4 py-3 backdrop-blur">
        <span className="block text-[0.65rem] uppercase tracking-widest text-accent">{TYPE_LABELS[item.type]} · {item.date}</span>
        <span className="mt-0.5 block text-base font-semibold leading-snug">{item.title}</span>
        {item.description && <span className="gc-reveal mt-1 block text-sm text-muted">{item.description.length > 160 ? `${item.description.slice(0, 157)}…` : item.description}</span>}
      </span>
    </button>
  );
}
