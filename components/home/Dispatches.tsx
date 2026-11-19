import "./dispatches.css";
import Link from "next/link";
import { getLiveDispatches } from "@/lib/dispatches-public";
import { KIND_LABELS } from "@/lib/dispatches";
import { DispatchCard } from "@/components/home/DispatchCard";

/** Home block: a ticker strip of headlines plus "Latest from the HQ" (3 cards). Nothing is shown when no dispatch is live. */
export async function Dispatches({ content }: { content: Record<string, string> }) {
  const live = await getLiveDispatches();
  if (live.length === 0) return null;
  const headlines = live.slice(0, 8);
  const copy = (hidden: boolean) => (
    <ul className="vhq-ticker-copy flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {headlines.map((d) => (
        <li key={d.id} className="whitespace-nowrap text-sm">
          <span className="mr-2 text-accent">{KIND_LABELS[d.kind]}</span>
          <Link href={`/dispatches#d-${d.id}`} tabIndex={hidden ? -1 : undefined} className="hover:text-accent">{d.title}</Link>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="dispatches-title" className="mx-auto mt-24 max-w-6xl">
      <div role="region" aria-label="Latest headlines" className="vhq-ticker overflow-hidden rounded-full border border-line bg-surface/60 py-2.5 pl-6">
        <div className="vhq-ticker-track">{copy(false)}{copy(true)}</div>
      </div>
      <div className="mt-12 flex flex-wrap items-end justify-between gap-3 px-1">
        <h2 id="dispatches-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
        <Link href="/dispatches" className="text-sm text-accent hover:underline">All dispatches &rarr;</Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {live.slice(0, 3).map((d) => <DispatchCard key={d.id} d={d} />)}
      </div>
    </section>
  );
}
