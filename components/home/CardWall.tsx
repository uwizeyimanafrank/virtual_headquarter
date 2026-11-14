import "./card-wall.css";
import Link from "next/link";
import { buildCards, cardLook, type WallCard } from "@/lib/card-wall";
import type { HomeItem } from "@/lib/home";
import { thumb } from "@/lib/media";
import { ImageStrip } from "@/components/home/ImageStrip";

const SHAPE = { tall: "aspect-[4/5]", wide: "aspect-[5/4]", square: "aspect-square" } as const;

function Card({ card }: { card: WallCard }) {
  const look = cardLook(card.id);
  const mood = card.kind === "mood";
  return (
    <li
      className="wall-card border border-line bg-surface"
      style={{ ["--rot" as string]: `${look.rotate}deg`, ["--lift" as string]: `${look.lift}px`, ["--glow" as string]: mood ? "rgba(109,93,252,0.5)" : "rgba(45,212,191,0.45)" }}
    >
      <Link href={card.href} aria-label={card.title || card.line} className="block overflow-hidden rounded-[1.25rem] outline-offset-4">
        <div className={`relative ${SHAPE[look.shape]} bg-[#0b1020]`}>
          {/* Pictures come from the owner's items or our drawn scenes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(card.image, 700)} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/95 via-bg/30 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full border border-line bg-bg/70 px-2.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-fg/80 backdrop-blur">{card.tag}</span>
          {card.sample && <span className="absolute right-3 top-3 rounded-full bg-bg/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-muted">Sample</span>}
          <div className="absolute inset-x-0 bottom-0 p-4">
            {card.title && <p className="font-semibold leading-snug">{card.title}</p>}
            <p className={mood ? "text-base italic leading-snug text-fg/90" : "mt-1 text-sm leading-snug text-muted"}>{card.line}</p>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Home block: many image cards to explore, in a loose layout, with two slow image strips for something always moving. */
export function CardWall({ items, content }: { items: readonly HomeItem[]; content: Record<string, string> }) {
  const cards = buildCards(items);
  const pics = cards.map((c) => c.image);
  return (
    <section aria-labelledby="card-wall-title" className="mx-auto mt-28 max-w-6xl px-4">
      <header className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">Explore</p>
        <h2 id="card-wall-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
        {content.intro && <p className="mt-4 text-lg text-muted">{content.intro}</p>}
      </header>
      <ImageStrip images={pics.slice(0, 8)} direction="left" />
      <ul className="wall" aria-label="Cards">{cards.map((c) => <Card key={c.id} card={c} />)}</ul>
      <ImageStrip images={pics.slice(4, 12)} direction="right" />
    </section>
  );
}
