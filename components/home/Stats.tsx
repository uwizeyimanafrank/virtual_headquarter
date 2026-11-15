import { buildStats } from "@/lib/home-sections";

/** Home block: up to four numbers at a glance. Only stats the owner filled in (number and label) are shown. */
export function Stats({ content }: { content: Record<string, string> }) {
  const stats = buildStats(content);
  if (stats.length === 0) return null;
  return (
    <section aria-labelledby="stats-title" className="mx-auto mt-24 max-w-5xl px-4">
      <h2 id="stats-title" className="text-center text-xs font-medium uppercase tracking-[0.3em] text-accent">{content.title}</h2>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface px-4 py-6 text-center">
            <dd className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.value}</dd>
            <dt className="mt-1 text-sm text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
