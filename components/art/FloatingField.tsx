"use client";
import "./floating.css";
import { useEffect, useRef, useState } from "react";
import { ICON_BY_KEY, ICONS, chooseCount, layoutItems, seededRandom, type FloatItem } from "@/lib/floating-icons";

type Props = {
  /** Icon keys (see lib/floating-icons.ts) or short emoji. Default: all icons. */
  items?: readonly string[];
  /** How many to show (never more than 16; fewer on small screens and with Save-Data). */
  count?: number;
  className?: string;
};

const ALL = ICONS.map((i) => i.key);

/**
 * Small items floating at random places behind the content. Positions are chosen after the page loads (so the
 * server and browser never disagree), they drift slowly, pause off screen and when the tab is hidden, and stay
 * still for visitors who prefer reduced motion. Never blocks a click. Decorative: hidden from screen readers.
 */
export function FloatingField({ items = ALL, count = 12, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<FloatItem[]>([]);
  const key = items.join("|");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const n = chooseCount(count, window.innerWidth, !!conn?.saveData);
    setList(layoutItems(key ? key.split("|") : ALL, n, seededRandom(Math.floor(Math.random() * 2 ** 31))));

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.dataset.motion = reduce ? "off" : "on";
    if (reduce) return;
    let visible = true;
    let hidden = document.hidden;
    const sync = () => { el.dataset.paused = String(!visible || hidden); };
    sync();
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; sync(); });
    io.observe(el);
    const onVis = () => { hidden = document.hidden; sync(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [key, count]);

  return (
    <div ref={ref} aria-hidden="true" data-motion="off" className={`ff pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {list.map((it) => {
        const icon = ICON_BY_KEY.get(it.glyph);
        return (
          <span
            key={it.id}
            className="ff-item"
            style={{
              left: `${it.x}%`, top: `${it.y}%`, width: it.size, height: it.size, opacity: it.opacity, color: it.color, fontSize: it.size * 0.8,
              ["--dx" as string]: `${it.dx}px`, ["--dy" as string]: `${it.dy}px`, ["--rot" as string]: `${it.rotate}deg`, ["--dur" as string]: `${it.duration}s`, ["--delay" as string]: `${it.delay}s`,
            }}
          >
            {icon ? (
              <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={icon.d} /></svg>
            ) : (
              it.glyph
            )}
          </span>
        );
      })}
    </div>
  );
}
