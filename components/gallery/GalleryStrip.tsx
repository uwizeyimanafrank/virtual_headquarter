import Link from "next/link";
import { getPublicGallery } from "@/lib/gallery-public";

/** Home block: a row of recent pictures that scrolls sideways, linking to the full gallery. Nothing is shown when there are no pictures. */
export async function GalleryStrip({ content }: { content: Record<string, string> }) {
  const { chapters } = await getPublicGallery();
  const photos = chapters.flatMap((c) => c.photos).slice(0, 10);
  if (photos.length === 0) return null;
  return (
    <section aria-labelledby="gallery-teaser-title" className="mx-auto mt-24 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <h2 id="gallery-teaser-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
        <Link href="/gallery" className="text-sm text-accent hover:underline">Open the gallery &rarr;</Link>
      </div>
      <ul className="mt-6 flex snap-x gap-3 overflow-x-auto pb-3">
        {photos.map((p) => (
          <li key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
            <Link href="/gallery" className="block overflow-hidden rounded-xl border border-line">
              {/* Resized links made by Cloudinary or bundled drawings. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} width={192} height={240} loading="lazy" decoding="async" draggable={false} className="aspect-[4/5] w-full object-cover" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
