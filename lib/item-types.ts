/** The kinds of Museum item. Kept in its own file so client code and plain tests can use it without the database. */
export const ITEM_TYPES = ["project", "certificate", "story", "book", "reference"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

/** Where an item is shown in the Museum: the Story Tour hall, the Glass Cases hall, or both (the default, so old items keep working). */
export const DISPLAY_MODES = ["tour", "case", "both"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];
export const DEFAULT_DISPLAY: DisplayMode = "both";
export const MAX_GALLERY = 8;

/** Anything missing or unknown counts as "both". */
export const normalizeDisplay = (v: unknown): DisplayMode => (DISPLAY_MODES as readonly unknown[]).includes(v) ? (v as DisplayMode) : DEFAULT_DISPLAY;
export const inTour = (d: DisplayMode) => d !== "case";
export const inCases = (d: DisplayMode) => d !== "tour";

/** Plain names for the label plates and filter chips. */
export const TYPE_LABELS: Record<ItemType, string> = { certificate: "Certificate", project: "Project", story: "Story", book: "Book", reference: "Reference" };
