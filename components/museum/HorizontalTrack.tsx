"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MOOD } from "@/components/museum/mood";
import { ItemModal } from "@/components/museum/ItemModal";
import { thumb } from "@/lib/media";
import type { MuseumChapter, MuseumItemData } from "@/lib/museum";

/**
 * The Museum for larger screens: scrolling DOWN walks the visitor SIDEWAYS through the chapters.
 * A section is pinned to the screen and a wide track slides left as you scroll (GSAP ScrollTrigger).
 * Each piece floats at its own speed (`parallaxSpeed`) and fades in as it nears the screen.
 * GSAP is loaded only when this component is used, so phones never download it.
 * Everything GSAP creates lives in one `gsap.context()` that is reverted on unmount, so switching
 * layouts (or resizing across the breakpoint) leaves no scroll triggers or listeners behind.
 */
export function HorizontalTrack({ chapters }: { chapters: MuseumChapter[] }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const jumpTo = useRef<(chapterIndex: number) => void>(() => {});
  const focusModule = useRef<(el: HTMLElement) => void>(() => {});
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<MuseumItemData | null>(null);
  const [returnTo, setReturnTo] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      const sectionEl = section.current;
      const trackEl = track.current;
      if (cancelled || !sectionEl || !trackEl) return;
      gsap.registerPlugin(ScrollTrigger);

      const revealsRef: Array<() => void> = [];
      ctx = gsap.context(() => {
        const distance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);
        const chapterEls = [...trackEl.querySelectorAll<HTMLElement>("[data-chapter]")];
        let current = 0;

        const tween = gsap.to(trackEl, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: sectionEl,
            pin: true,
            scrub: 0.6,
            start: "top top",
            end: () => `+=${Math.max(1, distance())}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (fill.current) fill.current.style.transform = `scaleX(${self.progress})`;
              const x = distance() * self.progress + window.innerWidth * 0.4;
              let idx = 0;
              chapterEls.forEach((el, i) => { if (el.offsetLeft <= x) idx = i; });
              if (idx !== current) { current = idx; setActive(idx); }
            },
          },
        });
        const st = tween.scrollTrigger;

        // Where on the page (scroll position) a given horizontal position of the track sits.
        const scrollFor = (trackX: number) => {
          if (!st) return 0;
          const d = distance();
          if (d <= 0) return st.start;
          return st.start + Math.min(1, Math.max(0, trackX / d)) * (st.end - st.start);
        };
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        jumpTo.current = (i) => {
          const el = chapterEls[i];
          if (el) window.scrollTo({ top: scrollFor(el.offsetLeft - window.innerWidth * 0.08), behavior: smooth ? "smooth" : "auto" });
        };
        // Tabbing to a piece that is off screen scrolls the page so the piece comes into view.
        focusModule.current = (el) => {
          const m = el.closest<HTMLElement>("[data-module]");
          if (m) window.scrollTo({ top: scrollFor(m.offsetLeft - (window.innerWidth - m.offsetWidth) / 2), behavior: "auto" });
        };

        const reveals = revealsRef; // checks run once after setup, so pieces already on the first screen appear without a scroll
        // Per piece: drift at its own speed while crossing the screen, and fade in once as it approaches.
        trackEl.querySelectorAll<HTMLElement>("[data-module]").forEach((el, i) => {
          const speed = Number(el.dataset.speed ?? 0.5);
          gsap.fromTo(el, { x: 140 * speed }, { x: -140 * speed, ease: "none", scrollTrigger: { trigger: el, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
          const inner = el.querySelector("[data-reveal]");
          if (inner) {
            const fade = gsap.fromTo(inner, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, delay: (i % 3) * 0.08, ease: "power2.out", paused: true });
            const reveal = () => { if (!fade.isActive() && fade.progress() === 0) fade.play(); };
            ScrollTrigger.create({ trigger: el, containerAnimation: tween, start: "left 92%", once: true, onEnter: reveal });
            reveals.push(() => { if (el.getBoundingClientRect().left < window.innerWidth * 0.92) reveal(); });
          }
        });
      }, sectionEl);
      // Evaluate the fade-ins once now, so pieces already on the first screen do not wait for the first scroll to appear.
      requestAnimationFrame(() => { if (!cancelled) { ScrollTrigger.update?.(); revealsRef.forEach((f) => f()); } });
    })();

    return () => {
      cancelled = true;
      ctx?.revert(); // removes every ScrollTrigger and style GSAP added
    };
  }, [chapters]);

  function openEntry(e: MuseumItemData, el: HTMLElement) {
    setReturnTo(el);
    setOpen(e);
  }

  return (
    // The outer div belongs to React. GSAP's pinning wraps the <section> in its own "pin-spacer" element
    // INSIDE this div, so when React removes the Museum it removes this div (never a node GSAP moved).
    <div data-testid="horizontal-museum">
    <section ref={section} aria-label="The Museum" className="relative h-screen overflow-clip">
      <div ref={track} data-testid="track" onFocusCapture={(e) => focusModule.current(e.target as HTMLElement)} className="relative flex h-full w-max items-center gap-[8vw] px-[8vw] pb-16 pt-20">
        {chapters.map((c, ci) => (
          <div key={c.key} data-chapter style={{ ["--chapter" as string]: MOOD[c.key] }} className="flex items-center gap-[4vw]">
            <div className="w-[24rem] shrink-0 rounded-3xl border border-line bg-surface p-8 backdrop-blur-md">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--chapter)]">Chapter {ci + 1}</p>
              <h2 className="mt-2 text-4xl font-semibold leading-tight">{c.title}</h2>
              <p className="mt-4 text-sm text-muted">{c.items.length} {c.items.length === 1 ? "piece" : "pieces"}</p>
            </div>
            {c.items.map((it, i) => (
              <div key={it.id} data-module data-speed={it.parallaxSpeed} className={`w-[22rem] shrink-0 ${i % 2 === 0 ? "-translate-y-8" : "translate-y-10"}`}>
                <div data-reveal>
                  <button
                    type="button"
                    onClick={(e) => openEntry(it, e.currentTarget)}
                    className="group block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-xl shadow-black/30 backdrop-blur-md transition hover:border-[var(--chapter)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chapter)]"
                  >
                    {it.mediaUrl && (
                      // Lazy-loaded and resized by Cloudinary; the address is checked when saved.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(it.mediaUrl, 640)} alt="" loading="lazy" decoding="async" width={640} height={400} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    )}
                    <div className="space-y-1.5 p-4">
                      <p className="font-mono text-xs text-muted">{it.date} &middot; {it.type}</p>
                      <h3 className="text-lg font-semibold leading-snug">{it.title}</h3>
                      {it.description && <p className="line-clamp-3 text-sm text-muted">{it.description}</p>}
                      <p className="pt-1 text-sm text-[var(--chapter)]">Read the story <span aria-hidden>&rarr;</span></p>
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="w-[22rem] shrink-0 pr-[8vw] text-center">
          <p className="text-2xl font-semibold">That is the tour.</p>
          <p className="mt-2 text-muted">Thank you for walking through it.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="rounded-full border border-line px-5 py-2 text-sm hover:bg-surface-strong">Back to Home</Link>
            <Link href="/connect" className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-bg">Say hello</Link>
          </div>
        </div>
      </div>

      <nav aria-label="Museum chapters" className="absolute inset-x-0 bottom-5 mx-auto w-[min(32rem,86vw)]">
        <div className="relative h-0.5 bg-surface-strong" aria-hidden>
          <div ref={fill} className="h-full origin-left scale-x-0 bg-accent" />
        </div>
        <ul className="mt-3 flex justify-between gap-2">
          {chapters.map((c, i) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => jumpTo.current(i)}
                aria-label={`Go to chapter ${i + 1}: ${c.title}`}
                aria-current={active === i ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-xs transition ${active === i ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <ItemModal entry={open} returnFocusTo={returnTo} onClose={() => setOpen(null)} />
    </section>
    </div>
  );
}
