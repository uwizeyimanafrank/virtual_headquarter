"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const FINE = "(hover: hover) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";

/** A soft glow that follows the mouse. Desktop with a real mouse only; nothing on phones, touch screens or reduced motion. */
export function CursorGlow() {
  // Server and first paint say "off"; the browser then answers from its media queries.
  const on = useSyncExternalStore(() => () => {}, () => window.matchMedia(FINE).matches && !window.matchMedia(REDUCED).matches, () => false);
  const glow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on) return;
    let frame = 0; let x = 0; let y = 0;
    const draw = () => { frame = 0; if (glow.current) glow.current.style.transform = `translate3d(${x - 200}px, ${y - 200}px, 0)`; };
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!frame) frame = requestAnimationFrame(draw); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); if (frame) cancelAnimationFrame(frame); };
  }, [on]);
  if (!on) return null;
  return <div ref={glow} aria-hidden="true" data-testid="cursor-glow" className="pointer-events-none fixed left-0 top-0 z-10 h-[400px] w-[400px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.35), transparent 65%)", transform: "translate3d(-400px, -400px, 0)" }} />;
}
