"use client";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { inTour } from "@/lib/item-types";
import type { MuseumChapter } from "@/lib/museum";
import { HorizontalTrack } from "@/components/museum/HorizontalTrack";
import { VerticalTimeline } from "@/components/museum/VerticalTimeline";

export const WIDE_QUERY = "(min-width: 768px)";

/**
 * Chooses the Museum layout: the sideways track on screens 768px and wider, the light vertical
 * timeline below that and for visitors who asked for reduced motion. The one that is not chosen is
 * not mounted at all, so switching destroys the sideways track completely (see HorizontalTrack).
 * The server always renders the vertical version, which also works without JavaScript.
 */
export function MuseumClient({ chapters }: { chapters: MuseumChapter[] }) {
  const wide = useMediaQuery(WIDE_QUERY);
  const reduced = useReducedMotion();
  // The Story Tour shows items marked "tour" or "both"; "case" items live in the Glass Cases hall only.
  const visible = chapters.map((c) => ({ ...c, items: c.items.filter((i) => inTour(i.display)) })).filter((c) => c.items.length > 0);
  return wide && !reduced ? <HorizontalTrack chapters={visible} /> : <VerticalTimeline chapters={visible} />;
}
