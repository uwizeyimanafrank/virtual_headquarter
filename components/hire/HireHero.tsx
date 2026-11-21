import type { HirePage } from "@/lib/hire-public";

const TONE = { open: "bg-emerald-400", soon: "bg-amber-300", busy: "bg-rose-400" } as const;

/** Top of /hire: the headline, whether you are taking work, and the two things a visitor most wants to do. */
export function HireHero({ page }: { page: HirePage }) {
  const { content, badge, cvUrl } = page;
  return (
    <header className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">Hire me</p>
      <p role="status" className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${TONE[badge.tone]}`} />
        <span>{badge.label}</span>
      </p>
      {content.availability.note && <p className="mt-2 text-sm text-muted">{content.availability.note}</p>}
      <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{content.headline}</h1>
      {content.intro && <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">{content.intro}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href="#request" className="rounded-xl bg-accent px-6 py-3 font-medium text-bg hover:opacity-90">Send a request</a>
        {cvUrl && <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line px-6 py-3 font-medium hover:bg-surface-strong">Download my CV</a>}
      </div>
    </header>
  );
}
