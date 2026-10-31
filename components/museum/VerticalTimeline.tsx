"use client";
import { useRef, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { thumb } from "@/lib/media";
import type { MuseumChapter, MuseumChapterKey, MuseumItemData } from "@/lib/museum";
import { ItemModal } from "@/components/museum/ItemModal";

// Each chapter has its own colour mood.
const MOOD: Record<MuseumChapterKey, string> = { about: "#2dd4bf", certificates: "#fbbf24", projects: "#818cf8", library: "#34d399" };

function Card({ entry, index, onOpen }: { entry: MuseumItemData; index: number; onOpen: (e: MuseumItemData, trigger: HTMLElement) => void }) {
  const { ref, hidden } = useReveal<HTMLLIElement>();
  return (
    <li
      ref={ref}
      style={{ transitionDelay: `${(index % 3) * 90}ms` }}
      className={`relative pl-8 transition duration-700 ease-out ${hidden ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100"}`}
    >
      <span aria-hidden className="absolute left-[-5px] top-6 h-2.5 w-2.5 rounded-full bg-[var(--chapter)] ring-4 ring-bg" />
      <button
        type="button"
        onClick={(e) => onOpen(entry, e.currentTarget)}
        className="group block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-lg shadow-black/20 backdrop-blur-md transition hover:border-[var(--chapter)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chapter)]"
      >
        {entry.mediaUrl && (
          // Lazy-loaded and resized by Cloudinary; address checked when saved.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(entry.mediaUrl, 640)} alt="" loading="lazy" decoding="async" width={640} height={400} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <div className="space-y-1.5 p-4">
          <p className="font-mono text-xs text-muted">{entry.date} &middot; {entry.type}</p>
          <h3 className="text-lg font-semibold leading-snug">{entry.title}</h3>
          {entry.description && <p className="line-clamp-3 text-sm text-muted">{entry.description}</p>}
          <p className="pt-1 text-sm text-[var(--chapter)]">Read the story <span aria-hidden>&rarr;</span></p>
        </div>
      </button>
    </li>
  );
}

/**
 * The Museum as a light vertical timeline. This is the layout for phones and small screens, and the
 * fallback for people who ask for reduced motion. (The sideways desktop version comes later.)
 */
export function VerticalTimeline({ chapters }: { chapters: MuseumChapter[] }) {
  const [open, setOpen] = useState<MuseumItemData | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [returnTo, setReturnTo] = useState<HTMLElement | null>(null);

  function openEntry(e: MuseumItemData, el: HTMLElement) {
    trigger.current = el;
    setReturnTo(el);
    setOpen(e);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-16 px-4 pb-24">
      {chapters.map((c) => (
        <section key={c.key} aria-labelledby={`chapter-${c.key}`} style={{ ["--chapter" as string]: MOOD[c.key] }}>
          <div className="mb-8 rounded-2xl border border-line bg-surface p-5 backdrop-blur-md">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--chapter)]">Chapter</p>
            <h2 id={`chapter-${c.key}`} className="mt-1 text-2xl font-semibold">{c.title}</h2>
          </div>
          <ol className="relative space-y-6 border-l border-line">
            {c.items.map((e, i) => <Card key={e.id} entry={e} index={i} onOpen={openEntry} />)}
          </ol>
        </section>
      ))}
      <ItemModal entry={open} returnFocusTo={returnTo} onClose={() => setOpen(null)} />
    </div>
  );
}
