import { getHomeData } from "@/lib/home";
import { CanvasCv } from "@/components/home/CanvasCv";
import { DemoBanner } from "@/components/site/DemoBanner";
import { Gate } from "@/components/home/Gate";
import { Hero } from "@/components/home/Hero";
import { HomeBackground } from "@/components/home/HomeBackground";
import { CardWall } from "@/components/home/CardWall";
import { FeaturedWork } from "@/components/home/FeaturedWork";
import { GalleryStrip } from "@/components/gallery/GalleryStrip";
import { Dispatches } from "@/components/home/Dispatches";
import { Journey } from "@/components/home/Journey";
import { Stats } from "@/components/home/Stats";
import { WhatIBuild } from "@/components/home/WhatIBuild";
import { HomeBlocks } from "@/components/home/HomeBlocks";
import { HomeTabs } from "@/components/home/HomeTabs";

export default async function Home() {
  const data = await getHomeData(); // cached; refreshed right after you edit content in the Office
  return (
    <main className="relative flex-1 px-4 py-12 sm:py-20">
      <HomeBackground />
      <div className="mx-auto max-w-6xl">
        <DemoBanner show={data.demo} />
        <HomeBlocks blocks={data.blocks} components={{
          hero: (b) => <HomeTabs hero={<Hero data={data} options={b.content} />} cv={<CanvasCv data={data} />} />,
          stats: (b) => <Stats content={b.content} />,
          whatIBuild: (b) => <WhatIBuild content={b.content} />,
          journey: (b) => <Journey items={data.items} content={b.content} />,
          featured: (b) => <FeaturedWork items={data.items} content={b.content} />,
          cardWall: (b) => <CardWall items={data.items} content={b.content} />,
          dispatches: (b) => <Dispatches content={b.content} />,
          gallery: (b) => <GalleryStrip content={b.content} />,
        }} />
        <Gate />
      </div>
    </main>
  );
}
