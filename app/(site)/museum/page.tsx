import Link from "next/link";
import { getMuseumData } from "@/lib/museum";
import { DemoBanner } from "@/components/site/DemoBanner";
import { MuseumClient } from "@/components/museum/MuseumClient";

export default async function MuseumPage() {
  const { chapters, demo } = await getMuseumData(); // cached; refreshed right after Office edits
  const empty = chapters.every((c) => c.items.length === 0);
  return (
    <main className="flex-1 pb-12 pt-8 sm:pb-20 sm:pt-12">
      <DemoBanner show={demo} />
      <header className="relative z-10 mx-auto mb-2 max-w-2xl px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">The Museum</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">The work, in order</h1>
        <p className="mt-4 text-muted">Scroll through the story. Open any piece to read how it came to be.</p>
      </header>
      {empty ? (
        <p className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center text-muted">The Museum is being prepared. Please come back soon.</p>
      ) : (
        // On wide screens the sideways track is a full-height scene; pulling it up under the title puts the first chapter on the first screen.
        <div className="md:-mt-[24vh]"><MuseumClient chapters={chapters} /></div>
      )}
      <p className="mt-10 text-center"><Link href="/" className="text-sm text-muted underline">Back to Home</Link></p>
    </main>
  );
}
