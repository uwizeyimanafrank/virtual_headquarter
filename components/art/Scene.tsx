"use client";
import "./scene.css";
import { useEffect, useRef } from "react";

type Props = {
  /** The scene's SVG text (from ART_SVG). Our own drawn art, never user input. */
  svg: string;
  className?: string;
  /** Move the layers by themselves. Always off for visitors who prefer reduced motion. */
  animate?: boolean;
  /** Layers shift a little with the mouse (desktop only) and with scrolling. */
  parallax?: boolean;
};

const clamp = (n: number) => Math.max(-1, Math.min(1, n));

/** Pointer position inside a box, as -1..1 on each side (0 = the centre). */
export function pointerOffset(clientX: number, clientY: number, box: { left: number; top: number; width: number; height: number }) {
  if (!box.width || !box.height) return { x: 0, y: 0 };
  return { x: clamp(((clientX - box.left) / box.width) * 2 - 1), y: clamp(((clientY - box.top) / box.height) * 2 - 1) };
}

/** Where a box sits on the screen: 0 when it is centred, positive when it is above the middle, negative when below (clamped to -1..1). */
export function scrollOffset(box: { top: number; height: number }, viewportHeight: number) {
  if (!viewportHeight) return 0;
  return clamp((viewportHeight / 2 - (box.top + box.height / 2)) / (viewportHeight / 2));
}

/**
 * A drawn scene with moving layers. Pauses when off screen or when the tab is hidden, stays still when the
 * visitor prefers reduced motion, and only follows the mouse on screens that have one. Decorative: hidden from screen readers.
 */
export function Scene({ svg, className = "", animate = true, parallax = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.dataset.motion = animate && !reduce ? "on" : "off";
    el.dataset.parallax = parallax && !reduce ? "on" : "off";
    if (reduce) return;

    let visible = true;
    let hidden = document.hidden;
    const sync = () => { el.dataset.paused = String(!visible || hidden); };
    sync();
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; sync(); });
    io.observe(el);
    const onVis = () => { hidden = document.hidden; sync(); };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty("--sy", scrollOffset(el.getBoundingClientRect(), window.innerHeight).toFixed(3)); });
    };
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      const o = pointerOffset(e.clientX, e.clientY, el.getBoundingClientRect());
      el.style.setProperty("--px", o.x.toFixed(3));
      el.style.setProperty("--py", o.y.toFixed(3));
    };
    const onLeave = () => { el.style.setProperty("--px", "0"); el.style.setProperty("--py", "0"); };
    if (parallax) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      if (mouse) { el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", onLeave); }
    }
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [animate, parallax]);

  return <div ref={ref} aria-hidden="true" className={`scene ${className}`} data-motion="off" data-parallax="off" dangerouslySetInnerHTML={{ __html: svg }} />;
}
