/**
 * Sample content shown until real content exists, so the site never looks empty.
 * Everything here is obviously fake on purpose. Images live in /public/samples (no Cloudinary needed).
 */
export const SAMPLE_PROFILE = {
  name: "Your Name",
  tagline: "Developer in progress",
  bio: "This is sample text. Open the Office, go to Settings and write your own story. Samples disappear when you delete them.",
  photoUrl: "/samples/profile.svg",
} as const;

const NOTE = " This is SAMPLE content. Replace it from the Office.";

export const SAMPLE_ITEMS = [
  { type: "story", title: "Sample story: How it started", description: "The moment you first wrote code and what you felt." + NOTE, mediaUrl: "/samples/story.svg", date: "2024-01", parallaxSpeed: 0.4, order: 0, metadata: { skills: [], howIEarnedIt: "" } },
  { type: "certificate", title: "Sample certificate: Web Development", description: "A certificate you earned, and how you earned it." + NOTE, mediaUrl: "/samples/certificate.svg", date: "2025-06", parallaxSpeed: 0.5, order: 0, metadata: { skills: ["HTML", "CSS", "JavaScript"], howIEarnedIt: "Describe the course, the exam or the project behind it." } },
  { type: "certificate", title: "Sample certificate: Networking Basics", description: "Another certificate or award." + NOTE, mediaUrl: "/samples/certificate.svg", date: "2025-09", parallaxSpeed: 0.7, order: 1, metadata: { skills: ["Networking"], howIEarnedIt: "" } },
  { type: "project", title: "Sample project: Task Tracker", description: "A project you built: what it does and what you learned." + NOTE, mediaUrl: "/samples/project.svg", date: "2026-02", parallaxSpeed: 0.6, order: 0, metadata: { skills: ["Next.js", "MongoDB"], howIEarnedIt: "" } },
  { type: "project", title: "Sample project: Shop Catalog", description: "Another project with its story." + NOTE, mediaUrl: "/samples/project.svg", date: "2026-05", parallaxSpeed: 0.8, order: 1, metadata: { skills: ["React", "Tailwind"], howIEarnedIt: "" } },
  { type: "book", title: "Sample book: A book that shaped you", description: "A book or reference, and why it matters to you." + NOTE, mediaUrl: "/samples/book.svg", date: "2026-01", parallaxSpeed: 0.5, order: 0, metadata: { skills: [], howIEarnedIt: "" } },
] as const;

/**
 * Which sample items may be shown publicly.
 * - showSamples off: no samples at all.
 * - autoHide on: samples of a type disappear once a REAL item of that type is in the list.
 * `items` must be the PUBLISHED items (real and sample together).
 */
export function applySampleRules<T extends { type: string; isSample?: boolean | null }>(
  items: T[],
  opts: { showSamples: boolean; autoHide: boolean },
): T[] {
  if (!opts.showSamples) return items.filter((i) => !i.isSample);
  if (!opts.autoHide) return items;
  const realTypes = new Set(items.filter((i) => !i.isSample).map((i) => i.type));
  return items.filter((i) => !i.isSample || !realTypes.has(i.type));
}
