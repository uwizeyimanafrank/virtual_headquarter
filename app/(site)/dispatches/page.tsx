import type { Metadata } from "next";
import { HomeBackground } from "@/components/home/HomeBackground";
import { DispatchList } from "@/components/home/DispatchList";
import { getLiveDispatches } from "@/lib/dispatches-public";

const description = "Short updates from the HQ: what I am building, learning and finishing.";
export const metadata: Metadata = {
  title: "Dispatches",
  description,
  openGraph: { title: "Dispatches", description, type: "website" },
  twitter: { card: "summary", title: "Dispatches", description },
  alternates: { types: { "application/rss+xml": "/feed.xml" } }, // lets feed readers find the feed
};

export default async function DispatchesPage() {
  const items = await getLiveDispatches();
  return (
    <main className="relative isolate flex-1 px-4 py-12 sm:py-20">
      <HomeBackground />
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">Dispatches</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Latest from the HQ</h1>
        <p className="mt-4 text-muted">{description} <a href="/feed.xml" className="text-accent hover:underline">RSS feed</a></p>
      </header>
      <div className="mx-auto max-w-6xl"><DispatchList items={items} /></div>
    </main>
  );
}
