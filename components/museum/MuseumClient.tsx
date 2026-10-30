"use client";
import type { Chapter } from "@/lib/museum-chapters";
import { VerticalTimeline } from "@/components/museum/VerticalTimeline";

/**
 * Chooses the Museum layout. For now it is always the vertical timeline.
 * P05-T04..T06 add the sideways GSAP track for large screens here and switch with useMediaQuery.
 */
export function MuseumClient({ chapters }: { chapters: Chapter[] }) {
  return <VerticalTimeline chapters={chapters} />;
}
