import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { setupAllowedFor, setupCode } from "@/lib/setup-guard";
import { SetupWizard } from "@/components/setup/SetupWizard";

export const metadata: Metadata = { title: "Connect your services", robots: { index: false, follow: false } };

// Reading the request host is live data, so it lives inside Suspense (the page shell can be prepared ahead of time).
async function Gate() {
  const h = await headers();
  if (!setupAllowedFor(h.get("host"))) notFound(); // on a real host this page does not exist
  setupCode(true); // prints the one-time code in the terminal
  return <SetupWizard />;
}

export default function SetupPage() {
  return (
    <main className="relative min-h-screen px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl"><Suspense fallback={null}><Gate /></Suspense></div>
    </main>
  );
}
