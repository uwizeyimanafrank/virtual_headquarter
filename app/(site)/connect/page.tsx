import type { Metadata } from "next";
import { HomeBackground } from "@/components/home/HomeBackground";
import { ConnectTerminal } from "@/components/connect/Terminal";

export const metadata: Metadata = { title: "Connect", description: "Sit down and send a message." };

export default function ConnectPage() {
  return (
    <main className="relative flex-1 px-4 py-12 sm:py-20">
      <HomeBackground />
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">Connect</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Pull up a chair</h1>
        <p className="mt-4 text-muted">This is where we talk. No social feeds, no noise: just you, a message, and an inbox I actually read.</p>
      </header>
      <ConnectTerminal />
    </main>
  );
}
