import { buildFeatured } from "@/lib/home-sections";
import type { HomeItem } from "@/lib/home";

const PARTS = [["Problem", "problem"], ["Action", "whatIDid"], ["Result", "result"]] as const;

/** Home block: up to 3 projects the owner picked in the Office, told as problem, action, result. Hidden until one is complete. */
export function FeaturedWork({ items, content }: { items: readonly HomeItem[]; content: Record<string, string> }) {
  const list = buildFeatured(items);
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="featured-title" className="mx-auto mt-28 max-w-6xl px-4">
      <header className="mx-auto max-w-2xl text-center">
        <h2 id="featured-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
        {content.intro && <p className="mt-4 text-lg text-muted">{content.intro}</p>}
      </header>
      <ul className="mt-10 grid gap-5 lg:grid-cols-3">
        {list.map((p) => (
          <li key={p.id} className="flex flex-col rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-xl font-semibold leading-snug">{p.title}</h3>
            <dl className="mt-4 space-y-3">
              {PARTS.map(([label, key]) => (
                <div key={key}><dt className="text-xs font-medium uppercase tracking-wider text-accent">{label}</dt><dd className="mt-0.5 text-muted">{p[key]}</dd></div>
              ))}
            </dl>
            {p.chips.length > 0 && <ul aria-label="Tech" className="mt-4 flex flex-wrap gap-1.5">{p.chips.map((c) => <li key={c} className="rounded-full border border-line px-2.5 py-0.5 text-xs">{c}</li>)}</ul>}
            {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-5 text-sm font-medium text-accent underline-offset-4 hover:underline">View live ↗</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}
