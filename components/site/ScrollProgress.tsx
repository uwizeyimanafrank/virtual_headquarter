"use client";

import { useEffect, useRef } from "react";

/** A thin bar at the top that fills as you scroll. Uses transform only, so it never shifts the layout. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return <div aria-hidden="true" data-testid="scroll-progress" className="pointer-events-none fixed inset-x-0 top-0 z-30 h-0.5"><div ref={bar} className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} /></div>;
}
