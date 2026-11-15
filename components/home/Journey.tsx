import { SceneImage } from "@/components/art/SceneImage";
import type { HomeItem } from "@/lib/home";
import { buildJourney } from "@/lib/home-sections";

/** Home block: a timeline of stories, certificates and projects (oldest first) over the journey backdrop (image slot home.journey.bg). */
export function Journey({ items, content }: { items: readonly HomeItem[]; content: Record<string, string> }) {
  const steps = buildJourney(items);
  return (
    <section aria-labelledby="journey-title" className="relative isolate mx-auto mt-28 max-w-6xl overflow-hidden rounded-3xl border border-line px-4 py-16 sm:px-10">
      <div aria-hidden="true" data-backdrop="home.journey.bg" className="pointer-events-none absolute inset-0 -z-10">
        <SceneImage slot="home.journey.bg" parallax={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/80 via-bg/85 to-bg/95" />
      </div>
      <header className="mx-auto max-w-2xl text-center">
        <h2 id="journey-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
        {content.intro && <p className="mt-4 text-lg text-muted">{content.intro}</p>}
      </header>
      <ol className="relative mx-auto mt-12 max-w-2xl border-l border-line pl-8">
        {steps.map((s) => (
          <li key={s.id} className="relative pb-10 last:pb-0">
            <span aria-hidden="true" className="absolute -left-[2.45rem] top-1.5 h-3 w-3 rounded-full bg-accent shadow-[0_0_14px_rgba(45,212,191,0.7)]" />
            <p className="text-xs uppercase tracking-wider text-muted">
              {[s.date, s.kind].filter(Boolean).join(" · ")}
              {s.sample && <span className="ml-2 rounded-full bg-bg/60 px-2 py-0.5 text-[0.6rem]">Sample</span>}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-snug">{s.title}</h3>
            {s.text && <p className="mt-1 text-muted">{s.text}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
