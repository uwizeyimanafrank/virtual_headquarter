import { getHomeData } from "@/lib/home";
import { CanvasCv } from "@/components/home/CanvasCv";
import { Gate } from "@/components/home/Gate";
import { Hero } from "@/components/home/Hero";
import { HomeBackground } from "@/components/home/HomeBackground";
import { HomeTabs } from "@/components/home/HomeTabs";

export default async function Home() {
  const data = await getHomeData(); // cached; refreshed right after you edit content in the Office
  return (
    <main className="relative flex-1 px-4 py-12 sm:py-20">
      <HomeBackground />
      <div className="mx-auto max-w-6xl">
        <HomeTabs hero={<Hero data={data} />} cv={<CanvasCv data={data} />} />
        <Gate />
      </div>
    </main>
  );
}
