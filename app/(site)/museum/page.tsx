import Link from "next/link";
import { getMuseumData } from "@/lib/museum";
import { MuseumClient } from "@/components/museum/MuseumClient";

export default async function MuseumPage() {
  const { chapters, profileName } = await getMuseumData(); // cached; refreshed right after Office edits
  return (
    <main className="flex-1 py-12 sm:py-20">
      <header className="mx-auto mb-14 max-w-2xl px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">The Museum</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{profileName ? `The work of ${profileName}` : "The work, in order"}</h1>
        <p className="mt-4 text-muted">Scroll through the story. Open any piece to read how it came to be.</p>
      </header>
      {chapters.length === 0 ? (
        <p className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center text-muted">The Museum is being prepared. Please come back soon.</p>
      ) : (
        <MuseumClient chapters={chapters} />
      )}
      <p className="mt-10 text-center"><Link href="/" className="text-sm text-muted underline">Back to Home</Link></p>
    </main>
  );
}
