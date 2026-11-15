import { buildCards } from "@/lib/home-sections";

/** Home block: up to three cards that say what the owner does. All words come from the Office. */
export function WhatIBuild({ content }: { content: Record<string, string> }) {
  const cards = buildCards(content);
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="build-title" className="mx-auto mt-28 max-w-6xl px-4">
      <h2 id="build-title" className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <li key={c.title} className="rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/60">
            <span aria-hidden="true" className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 text-lg font-semibold leading-snug">{c.title}</h3>
            {c.text && <p className="mt-2 text-muted">{c.text}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
