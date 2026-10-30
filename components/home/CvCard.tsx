"use client";
import { useTilt } from "@/hooks/useTilt";

/** A floating glass card. Leans toward the mouse on desktop, gently floats on touch screens. */
export function CvCard({ kicker, title, className = "", delay = 0, children }: { kicker: string; title: string; className?: string; delay?: number; children: React.ReactNode }) {
  const { ref, enabled, handlers } = useTilt<HTMLElement>(7);
  return (
    <article
      ref={ref}
      {...handlers}
      style={{ animationDelay: `${delay}s` }}
      className={`rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-black/20 backdrop-blur-md [@media(hover:none)]:motion-safe:animate-[float_7s_ease-in-out_infinite] ${enabled ? "transition-transform duration-150 ease-out will-change-transform" : ""} ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-widest text-accent">{kicker}</p>
      <h3 className="mb-3 mt-1 text-lg font-semibold">{title}</h3>
      {children}
    </article>
  );
}
