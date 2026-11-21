import type { Metadata } from "next";
import { Backdrop } from "@/components/art/Backdrop";
import { HomeBackground } from "@/components/home/HomeBackground";
import { DemoBanner } from "@/components/site/DemoBanner";
import { HireForm } from "@/components/hire/HireForm";
import { HireHero } from "@/components/hire/HireHero";
import { Faq, HireFeatured, Services, Steps } from "@/components/hire/HireSections";
import { getHirePage } from "@/lib/hire-public";

const description = "Work with me: what I can build, how we work together, and a simple way to send a request.";
export const metadata: Metadata = {
  title: "Hire me",
  description,
  openGraph: { title: "Hire me", description, type: "website" },
  twitter: { card: "summary", title: "Hire me", description },
};

export default async function HirePage() {
  const page = await getHirePage(); // cached; refreshed right after Office changes
  const { content } = page;
  return (
    <main className="relative isolate flex-1 px-4 py-12 sm:py-20">
      <HomeBackground />
      <Backdrop slot="hire.backdrop" />
      <DemoBanner show={page.demo} />
      <HireHero page={page} />
      <Services items={content.services} />
      <Steps items={content.steps} />
      <HireFeatured items={page.items} />
      <Faq items={content.faq} />
      <section id="request" aria-labelledby="hire-request" className="mx-auto mt-24 max-w-2xl scroll-mt-20">
        <h2 id="hire-request" className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">Tell me what you need</h2>
        <p className="mb-8 mt-3 text-center text-muted">Just want to say hello? The <a href="/connect" className="text-accent hover:underline">Connect page</a> is for that. This one is for real work.</p>
        <HireForm />
      </section>
    </main>
  );
}
