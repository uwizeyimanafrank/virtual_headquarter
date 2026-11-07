// The registry of every fixed picture on the public site. See docs/book/05-image-slots.md.
// Rule: no fixed picture is written into a component. A component asks for a slot; the owner can
// replace the picture in the Office; with no replacement the default below shows.
// To add a slot: add a row here AND to the table in docs/book/05-image-slots.md.

export type ImageSlotDef = {
  key: string; // page.place, small letters, e.g. "home.hero.character"
  label: string; // shown in the Office
  page: string; // group name in the Office
  section: string;
  where: string; // plain words: where it appears
  aspect: string; // e.g. "16:9"
  minWidth: number; // recommended minimum width in pixels
  defaultSrc: string; // a file in /public (our own art)
  decorative: boolean; // true = no alt text needed (hidden from screen readers)
};

const D = "/art/defaults/";
const s = (key: string, label: string, page: string, section: string, where: string, aspect: string, minWidth: number, defaultSrc: string, decorative = true): ImageSlotDef =>
  ({ key, label, page, section, where, aspect, minWidth, defaultSrc, decorative });

export const SLOTS: readonly ImageSlotDef[] = [
  s("home.hero.bg", "Hero background", "Home", "Hero", "Home, top of the page, behind everything", "16:9", 1600, D + "wide.svg"),
  s("home.hero.character", "Hero character", "Home", "Hero", "Home, top, on one side, half in shadow", "4:5", 900, D + "tall.svg"),
  s("home.profile.photo", "Profile photo", "Home", "Canvas CV", "Home, profile card and Canvas CV", "1:1", 600, "/samples/profile.svg", false),
  s("home.journey.bg", "Journey backdrop", "Home", "Journey", "Home, behind the journey timeline", "16:9", 1600, D + "wide.svg"),
  s("home.hire.band", "Hire band", "Home", "Hire band", "Home, wide band that invites people to hire you", "21:9", 1800, D + "band.svg"),
  s("home.avatar.portrait", "Avatar teaser", "Home", "Avatar", "Home, the block that introduces your avatar", "1:1", 600, D + "square.svg"),
  s("museum.backdrop", "Museum header", "Museum", "Header", "Museum, behind the title at the top", "16:9", 1600, D + "wide.svg"),
  s("museum.hall.tour", "Door: Story Tour", "Museum", "Halls", "Museum, the door card for the Story Tour hall", "4:3", 900, D + "card.svg"),
  s("museum.hall.cases", "Door: Glass Cases", "Museum", "Halls", "Museum, the door card for the Glass Cases hall", "4:3", 900, D + "card.svg"),
  s("gallery.backdrop", "Gallery header", "Gallery", "Header", "Gallery, behind the title at the top", "16:9", 1600, D + "wide.svg"),
  s("dispatches.backdrop", "Dispatches header", "Dispatches", "Header", "Dispatches (news), behind the title at the top", "16:9", 1600, D + "wide.svg"),
  s("hire.backdrop", "Hire header", "Hire", "Header", "Hire page, behind the title at the top", "16:9", 1600, D + "wide.svg"),
  s("hire.handshake", "Hire main art", "Hire", "Main art", "Hire page, the main picture beside the form", "3:2", 1200, D + "photo.svg"),
  s("connect.backdrop", "Connect header", "Connect", "Header", "Connect page, behind the title at the top", "16:9", 1600, D + "wide.svg"),
  s("avatar.figure", "Floating avatar", "Avatar", "Button and panel", "Every public page, the small floating avatar", "1:1", 400, D + "square.svg", false),
  s("site.og.default", "Share preview (default)", "Whole site", "Share previews", "The picture shown when your link is shared on WhatsApp, X or LinkedIn", "1.91:1", 1200, D + "share.svg"),
  s("site.og.home", "Share preview: Home", "Whole site", "Share previews", "Share picture for the Home page (falls back to the default)", "1.91:1", 1200, D + "share.svg"),
  s("site.og.museum", "Share preview: Museum", "Whole site", "Share previews", "Share picture for the Museum page (falls back to the default)", "1.91:1", 1200, D + "share.svg"),
  s("site.og.hire", "Share preview: Hire", "Whole site", "Share previews", "Share picture for the Hire page (falls back to the default)", "1.91:1", 1200, D + "share.svg"),
  s("site.favicon", "Browser tab icon", "Whole site", "Icons", "The small icon in the browser tab", "1:1", 256, D + "square.svg"),
  s("site.notfound", "Page not found art", "Whole site", "Errors", "The 404 page", "4:3", 900, D + "card.svg"),
];

export type OverrideDoc = { key: string; url?: string | null; alt?: string | null; focal?: { x?: number; y?: number } | null; credit?: string | null; license?: string | null; kind?: string | null };

export type ResolvedSlot = {
  key: string; src: string; alt: string; focal: { x: number; y: number }; credit: string; license: string;
  custom: boolean; decorative: boolean; aspect: string; ratio: number; label: string;
};

const BY_KEY = new Map(SLOTS.map((d) => [d.key, d]));
export const slotDef = (key: string): ImageSlotDef | undefined => BY_KEY.get(key);

export function aspectRatio(aspect: string): number {
  const [a, b] = aspect.split(":").map(Number);
  return b ? a / b : 1;
}

/** Only pictures stored in our Cloudinary are accepted from the database (the site's security policy allows nothing else). */
export const isAllowedPictureUrl = (u: unknown): u is string => typeof u === "string" && /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_./~%:@+,-]+$/.test(u);

const clamp = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50);

/** Pure: puts the owner's replacements over the defaults. Unknown keys and unsafe addresses are ignored. */
export function resolveSlots(overrides: readonly OverrideDoc[] = []): Record<string, ResolvedSlot> {
  const custom = new Map(overrides.map((o) => [o.key, o]));
  const out: Record<string, ResolvedSlot> = {};
  for (const d of SLOTS) {
    const o = custom.get(d.key);
    const useCustom = !!o && isAllowedPictureUrl(o.url);
    out[d.key] = {
      key: d.key,
      label: d.label,
      src: useCustom ? (o!.url as string) : d.defaultSrc,
      alt: d.decorative ? "" : (useCustom ? (o!.alt ?? "") : "") || d.label,
      focal: { x: clamp(useCustom ? o!.focal?.x : 50), y: clamp(useCustom ? o!.focal?.y : 50) },
      credit: useCustom ? (o!.credit ?? "") : "",
      license: useCustom ? (o!.license ?? "") : "",
      custom: useCustom,
      decorative: d.decorative,
      aspect: d.aspect,
      ratio: aspectRatio(d.aspect),
    };
  }
  return out;
}

/** Slots grouped by page for the Office screen, in registry order. */
export function groupSlots(): { page: string; slots: ImageSlotDef[] }[] {
  const groups: { page: string; slots: ImageSlotDef[] }[] = [];
  for (const d of SLOTS) {
    let g = groups.find((x) => x.page === d.page);
    if (!g) groups.push((g = { page: d.page, slots: [] }));
    g.slots.push(d);
  }
  return groups;
}
