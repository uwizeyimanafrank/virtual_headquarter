import "./hero.css";
import Link from "next/link";
import { thumb } from "@/lib/media";
import type { HomeData } from "@/lib/home";
import { DEFAULT_MOOD, heroMasks, moodFrom, moodStyle, sanitizeSide } from "@/lib/hero-style";
import { slotPagePath } from "@/lib/image-slots";
import { getSlot } from "@/lib/slots";
import { FloatingField } from "@/components/art/FloatingField";
import { SceneImage } from "@/components/art/SceneImage";

const NOISE = "0 0 200 200"; // grain is drawn as an inline SVG filter, so no picture file is needed

/**
 * The first screen of Home. A full-width picture, the character on one side fading into the dark (half in
 * shadow), floating items, and the words on the other side. Every picture is an image slot, so the owner can
 * replace any of them in the Office. All wording comes from the settings.
 */
export async function Hero({ data, options = {} }: { data: HomeData; options?: Record<string, string> }) {
  const { profile } = data;
  const side = sanitizeSide(options.side);
  const mood = moodStyle(moodFrom({ ...DEFAULT_MOOD, ...options }));
  const character = await getSlot("home.hero.character");
  const photo = !!character?.custom; // the owner's own photo gets the mood filter; our drawn scene already has it
  const hireLive = slotPagePath({ page: "Hire" }) !== null; // the Hire page arrives in P14
  const textOnRight = side === "left";

  return (
    <section aria-label="Welcome" className="relative isolate overflow-hidden rounded-3xl border border-line bg-bg shadow-2xl shadow-black/40">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <SceneImage slot="home.hero.bg" priority />
        <div className={`hero-aura absolute left-[10%] top-[2%] h-[22rem] w-[80%] rounded-full [background:radial-gradient(closest-side,rgba(109,93,252,0.5),rgba(45,212,191,0.2)_55%,transparent)] lg:top-[8%] lg:h-[85%] lg:w-[55%] ${side === "right" ? "lg:left-auto lg:right-[-12%]" : "lg:left-[-12%]"}`} />
        <div
          className={`hero-char absolute left-1/2 top-0 h-[24rem] w-full max-w-[26rem] -translate-x-1/2 lg:inset-y-0 lg:left-auto lg:h-auto lg:max-w-none lg:translate-x-0 lg:w-[58%] ${side === "right" ? "lg:right-0" : "lg:left-0"}`}
          style={{ ["--hero-mask" as string]: heroMasks(side).maskImage, ...(photo ? { filter: mood.filter } : {}) }}
        >
          <SceneImage slot="home.hero.character" priority parallax={false} />
          {photo && <div className="absolute inset-0 bg-teal-300 mix-blend-color" style={{ opacity: mood.tintOpacity }} />}
        </div>
        {photo && mood.grainOpacity > 0 && (
          <svg className="absolute inset-0 h-full w-full mix-blend-overlay" style={{ opacity: mood.grainOpacity }} viewBox={NOISE} preserveAspectRatio="none">
            <filter id="hero-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
            <rect width="100%" height="100%" filter="url(#hero-grain)" />
          </svg>
        )}
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(3,5,10,${mood.vignetteOpacity}) 100%)` }} />
        <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-bg/30 to-bg/95 lg:bg-gradient-to-r ${textOnRight ? "lg:from-transparent lg:via-bg/40 lg:to-bg/95" : "lg:from-bg/95 lg:via-bg/40 lg:to-transparent"}`} />
        <FloatingField count={10} className="max-lg:opacity-40" xRange={side === "right" ? [46, 96] : [4, 54]} />
      </div>

      <div className={`relative z-10 flex min-h-[34rem] flex-col justify-end p-7 pt-[17rem] sm:p-12 sm:pt-[17rem] lg:min-h-[38rem] lg:justify-center lg:p-14 ${textOnRight ? "lg:items-end lg:text-right" : ""}`}>
        <div className="max-w-xl">
          {(profile.name || profile.photoUrl) && (
            <div className={`mb-8 flex items-center gap-4 ${textOnRight ? "lg:flex-row-reverse" : ""}`}>
              {profile.photoUrl && (
                // Cloudinary or bundled sample only (checked when saved). Small.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb(profile.photoUrl, 160)} alt={profile.name ? `Photo of ${profile.name}` : "Profile photo"} width={64} height={64} className="h-16 w-16 rounded-full border border-line object-cover" />
              )}
              <div>
                {profile.name && <p className="font-medium">{profile.name}</p>}
                {profile.tagline && <p className="text-sm text-muted">{profile.tagline}</p>}
              </div>
            </div>
          )}
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">Personal Virtual Headquarters</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight [text-shadow:0_2px_24px_rgba(0,0,0,0.6)] sm:text-6xl">{data.heroTitle}</h1>
          <p className="mt-6 text-lg leading-relaxed text-fg/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">{data.heroText}</p>
          <p className={`mt-8 border-accent text-fg ${textOnRight ? "border-l-2 pl-4 lg:border-l-0 lg:border-r-2 lg:pl-0 lg:pr-4" : "border-l-2 pl-4"}`}>
            Consider this an open invitation: a free tour of the work, no tickets, no guide talking over it. Step into the Museum when you are ready.
          </p>
          <div className={`mt-9 flex flex-wrap gap-3 ${textOnRight ? "lg:justify-end" : ""}`}>
            <Link href="/museum" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg shadow-lg shadow-accent/20 transition hover:scale-[1.03]">Enter the Museum <span aria-hidden>&rarr;</span></Link>
            {hireLive && <Link href="/hire" className="inline-flex items-center rounded-full border border-line bg-bg/50 px-6 py-3 font-medium backdrop-blur transition hover:border-accent">Hire me</Link>}
          </div>
        </div>
      </div>
      <p aria-hidden="true" className="hero-cue pointer-events-none absolute inset-x-0 bottom-4 z-10 text-center text-xs uppercase tracking-[0.35em] text-muted">Scroll &darr;</p>
    </section>
  );
}
