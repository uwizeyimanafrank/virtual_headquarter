"use client";
import type { MuseumChapter } from "@/lib/museum";
import { VerticalTimeline } from "@/components/museum/VerticalTimeline";

/**
 * Chooses the Museum layout. For now it is always the vertical timeline (chapters with no items are
 * skipped). P05-T04..T06 add the sideways GSAP track for large screens here and switch with useMediaQuery.
 */
export function MuseumClient({ chapters }: { chapters: MuseumChapter[] }) {
  return <VerticalTimeline chapters={chapters.filter((c) => c.items.length > 0)} />;
}
