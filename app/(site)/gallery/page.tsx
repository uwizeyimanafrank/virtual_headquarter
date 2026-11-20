import type { Metadata } from "next";
import { HomeBackground } from "@/components/home/HomeBackground";
import { DemoBanner } from "@/components/site/DemoBanner";
import { GalleryWall } from "@/components/gallery/GalleryWall";
import { getPublicGallery } from "@/lib/gallery-public";

const description = "Pictures from along the way, collected into albums.";
export const metadata: Metadata = {
  title: "Gallery",
  description,
  openGraph: { title: "Gallery", description, type: "website" },
  twitter: { card: "summary", title: "Gallery", description },
};

export default async function GalleryPage() {
  const { chapters, demo } = await getPublicGallery(); // cached; refreshed right after Office changes
  return (
    <main className="relative isolate flex-1 px-4 py-12 sm:py-20">
      <HomeBackground />
      <DemoBanner show={demo} />
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">Gallery</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Pinned to the wall</h1>
        <p className="mt-4 text-muted">{description}</p>
      </header>
      {chapters.length === 0
        ? <p className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center text-muted">The gallery is being prepared. Please come back soon.</p>
        : <div className="mx-auto max-w-6xl"><GalleryWall chapters={chapters} /></div>}
    </main>
  );
}
