import { buildFeatured } from "@/lib/home-sections";
import type { HomeItem } from "@/lib/home";
import type { HireContent } from "@/lib/hire";

const H2 = "text-3xl font-semibold tracking-tight sm:text-4xl";

export function Services({ items }: { items: HireContent["services"] }) {
  return (
    <section aria-labelledby="hire-services" className="mx-auto mt-24 max-w-6xl">
      <h2 id="hire-services" className={`${H2} text-center`}>What I can do for you</h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <li key={s.title} className="rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-muted">{s.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Steps({ items }: { items: HireContent["steps"] }) {
  return (
    <section aria-labelledby="hire-steps" className="mx-auto mt-24 max-w-5xl">
      <h2 id="hire-steps" className={`${H2} text-center`}>How we work together</h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((s, n) => (
          <li key={s.title} className="rounded-2xl border border-line bg-surface p-6">
            <span aria-hidden="true" className="text-sm font-medium text-accent">Step {n + 1}</span>
            <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Up to 3 projects the owner marked as featured (problem, action, result). Nothing is shown until at least one is complete. */
export function HireFeatured({ items }: { items: readonly HomeItem[] }) {
  const list = buildFeatured(items);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="hire-work" className="mx-auto mt-24 max-w-6xl">
      <h2 id="hire-work" className={`${H2} text-center`}>Work you can check</h2>
      <ul className="mt-8 grid gap-4 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.id} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
            <p className="mt-3 text-sm text-muted"><span className="font-medium text-fg">Result: </span>{p.result}</p>
            {p.chips.length > 0 && <ul aria-label="Tech" className="mt-4 flex flex-wrap gap-1.5">{p.chips.map((c) => <li key={c} className="rounded-full border border-line px-2.5 py-0.5 text-xs">{c}</li>)}</ul>}
            {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">View live ↗</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Questions and answers with the browser's own open/close control: no script needed, works with the keyboard. */
export function Faq({ items }: { items: HireContent["faq"] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="hire-faq" className="mx-auto mt-24 max-w-3xl">
      <h2 id="hire-faq" className={`${H2} text-center`}>Questions people ask</h2>
      <div className="mt-8 space-y-3">
        {items.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-line bg-surface p-5 open:bg-surface-strong">
            <summary className="cursor-pointer list-none font-medium marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-accent group-open:hidden" aria-hidden="true">+</span>
              <span className="mr-2 hidden text-accent group-open:inline" aria-hidden="true">−</span>{f.q}
            </summary>
            <p className="mt-3 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
