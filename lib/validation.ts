import { DISPATCH_KINDS } from "@/lib/dispatches";
import { DISPLAY_MODES, MAX_GALLERY } from "@/lib/item-types";
import { z } from "zod";
import { ITEM_TYPES } from "@/models/MuseumItem";

/** Shared limits so every form and API route agrees. */
export const LIMITS = { title: 120, description: 4000, name: 80, email: 160, message: 2000, url: 500 } as const;

// Remove invisible control characters and trim. Text is always treated as plain text.
const cleanText = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
export const text = (max: number) => z.string().transform(cleanText).pipe(z.string().max(max));

const httpUrl = z
  .string()
  .max(LIMITS.url)
  .regex(/^https?:\/\/\S+$/i, "must be a web address starting with http:// or https://");

/**
 * Media must be hosted on Cloudinary (https) or be one of our bundled /samples/ files.
 * Why: the site's Content Security Policy only allows images from those two places,
 * so any other address would simply show as a broken image.
 */
const mediaUrl = z
  .string()
  .max(LIMITS.url)
  .refine(
    (v) => {
      if (v === "") return true;
      if (/^\/samples\/[\w./-]+$/.test(v)) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && u.hostname === "res.cloudinary.com";
      } catch {
        return false;
      }
    },
    { message: "mediaUrl must be an uploaded image (Cloudinary) or a /samples/ file" },
  );

/** A video must be uploaded to Cloudinary (https). Empty means no video. */
const videoUrl = z
  .string()
  .max(LIMITS.url)
  .refine((v) => {
    if (v === "") return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && u.hostname === "res.cloudinary.com";
    } catch {
      return false;
    }
  }, { message: "video must be an uploaded video (Cloudinary)" });

// Field rules WITHOUT defaults, so the same rules serve both "create" and "partial update".
const field = {
  type: z.enum(ITEM_TYPES),
  title: text(LIMITS.title).pipe(z.string().min(1)),
  description: text(LIMITS.description),
  mediaUrl,
  parallaxSpeed: z.number().min(0.1).max(1.5),
  display: z.enum(DISPLAY_MODES),
  gallery: z.array(mediaUrl.pipe(z.string().min(1))).max(MAX_GALLERY),
  video: videoUrl,
  date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "date must be YYYY-MM"),
  status: z.enum(["draft", "published"]),
  order: z.number().int(),
};
const metadataFields = {
  gradeOrLink: z.union([httpUrl, z.literal("")]),
  skills: z.array(text(40).pipe(z.string().min(1))).max(20),
  howIEarnedIt: text(2000),
  problem: text(300),
  whatIDid: text(300),
  result: text(300),
  featured: z.boolean(),
};

/** Creating an item: sensible defaults for everything except type, title and date. */
export const museumItemInput = z.object({
  type: field.type,
  title: field.title,
  description: field.description.default(""),
  mediaUrl: field.mediaUrl.default(""),
  parallaxSpeed: field.parallaxSpeed.default(0.5),
  display: field.display.default("both"),
  gallery: field.gallery.default([]),
  video: field.video.default(""),
  date: field.date,
  status: field.status.default("draft"),
  order: field.order.default(0),
  metadata: z
    .object({
      gradeOrLink: metadataFields.gradeOrLink.optional(),
      skills: metadataFields.skills.default([]),
      howIEarnedIt: metadataFields.howIEarnedIt.optional(),
      problem: metadataFields.problem.optional(),
      whatIDid: metadataFields.whatIDid.optional(),
      result: metadataFields.result.optional(),
      featured: metadataFields.featured.optional(),
    })
    .default({ skills: [] }),
});
export type MuseumItemInput = z.infer<typeof museumItemInput>;

/** Updating an item: every field optional and NO defaults, so a partial update never wipes other fields. */
export const museumItemPatch = z.object({
  type: field.type.optional(),
  title: field.title.optional(),
  description: field.description.optional(),
  mediaUrl: field.mediaUrl.optional(),
  parallaxSpeed: field.parallaxSpeed.optional(),
  display: field.display.optional(),
  gallery: field.gallery.optional(),
  video: field.video.optional(),
  date: field.date.optional(),
  status: field.status.optional(),
  order: field.order.optional(),
  metadata: z
    .object({
      gradeOrLink: metadataFields.gradeOrLink.optional(),
      skills: metadataFields.skills.optional(),
      howIEarnedIt: metadataFields.howIEarnedIt.optional(),
      problem: metadataFields.problem.optional(),
      whatIDid: metadataFields.whatIDid.optional(),
      result: metadataFields.result.optional(),
      featured: metadataFields.featured.optional(),
    })
    .optional(),
});

// ---- Dispatches (P13-T02) ----
// Dates travel as text: day = YYYY-MM-DD, schedule moments = ISO time with offset (the form converts), null/empty = not set.
const dispatchMoment = z.union([z.iso.datetime({ offset: true }), z.literal("").transform(() => null), z.null()]);
const dispatchField = {
  title: field.title,
  text: text(600),
  kind: z.enum(DISPATCH_KINDS),
  imageUrl: mediaUrl,
  video: videoUrl,
  date: z.iso.date(),
  pinned: z.boolean(),
  publishAt: dispatchMoment,
  expireAt: dispatchMoment,
  published: z.boolean(),
};
const endsAfterStart = (v: { publishAt?: string | null; expireAt?: string | null }) =>
  !v.publishAt || !v.expireAt || new Date(v.expireAt).getTime() > new Date(v.publishAt).getTime();
const endsAfterStartMsg = { message: "expireAt must be after publishAt", path: ["expireAt"] };

/** Creating a dispatch: only the title is needed; it starts as a draft unless you say "published". */
export const dispatchInput = z
  .object({
    title: dispatchField.title,
    text: dispatchField.text.default(""),
    kind: dispatchField.kind.default("note"),
    imageUrl: dispatchField.imageUrl.default(""),
    video: dispatchField.video.default(""),
    date: dispatchField.date.default(() => new Date().toISOString().slice(0, 10)),
    pinned: dispatchField.pinned.default(false),
    publishAt: dispatchField.publishAt.default(null),
    expireAt: dispatchField.expireAt.default(null),
    published: dispatchField.published.default(false),
  })
  .refine(endsAfterStart, endsAfterStartMsg);
export type DispatchInput = z.infer<typeof dispatchInput>;

/** Updating a dispatch: every field optional, NO defaults, so a partial update never wipes other fields. */
export const dispatchPatch = z
  .object({
    title: dispatchField.title.optional(),
    text: dispatchField.text.optional(),
    kind: dispatchField.kind.optional(),
    imageUrl: dispatchField.imageUrl.optional(),
    video: dispatchField.video.optional(),
    date: dispatchField.date.optional(),
    pinned: dispatchField.pinned.optional(),
    publishAt: dispatchField.publishAt.optional(),
    expireAt: dispatchField.expireAt.optional(),
    published: dispatchField.published.optional(),
  })
  .refine(endsAfterStart, endsAfterStartMsg);

// ---- Gallery (P13-T04) ----
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "not a valid id");
const nullableId = z.union([objectId, z.literal("").transform(() => null), z.null()]);
const takenDate = z.union([z.iso.date(), z.literal("").transform(() => null), z.null()]);
const galleryField = {
  imageUrl: mediaUrl.pipe(z.string().min(1, "a picture is required")).refine((v) => !v.startsWith("/samples/"), "upload a real picture"),
  caption: text(200),
  alt: text(200).pipe(z.string().min(1, "alt text is required")), // describes the picture for people who cannot see it
  album: nullableId,
  takenDate,
  order: z.number().int(),
  published: z.boolean(),
};

/** Adding a picture to the gallery: the picture and its alt text are required, everything else has a safe default (a draft, no album). */
export const galleryImageInput = z.object({
  imageUrl: galleryField.imageUrl,
  alt: galleryField.alt,
  caption: galleryField.caption.default(""),
  album: galleryField.album.default(null),
  takenDate: galleryField.takenDate.default(null),
  order: galleryField.order.default(0),
  published: galleryField.published.default(false),
});

/** Updating a picture: every field optional and NO defaults. Alt text can be changed but never emptied. */
export const galleryImagePatch = z.object({
  imageUrl: galleryField.imageUrl.optional(),
  alt: galleryField.alt.optional(),
  caption: galleryField.caption.optional(),
  album: galleryField.album.optional(),
  takenDate: galleryField.takenDate.optional(),
  order: galleryField.order.optional(),
  published: galleryField.published.optional(),
});

export const albumInput = z.object({ title: text(80).pipe(z.string().min(1, "a title is required")), description: text(300).default(""), order: z.number().int().default(0) });
export const albumPatch = z.object({ title: text(80).pipe(z.string().min(1)).optional(), description: text(300).optional(), order: z.number().int().optional() });

export const contactInput = z.object({
  name: text(LIMITS.name).pipe(z.string().min(1)),
  email: z.string().trim().toLowerCase().max(LIMITS.email).pipe(z.email()),
  message: text(LIMITS.message).pipe(z.string().min(1)),
  website: z.string().max(200).optional(), // honeypot: real people leave it empty
});
export type ContactInput = z.infer<typeof contactInput>;

/** Site settings the owner can edit from the Office. */
export const settingsPatch = z.object({
  heroTitle: text(160).optional(),
  heroText: text(600).optional(),
  twinAvatarUrl: mediaUrl.optional(),
  effects: z.object({ scrollProgress: z.boolean(), cursorGlow: z.boolean(), reveal: z.boolean(), floatingItems: z.boolean(), movingScenes: z.boolean() }).partial().optional(),
  chapterTitles: z
    .object({ about: text(80), certificates: text(80), projects: text(80), library: text(80) })
    .partial()
    .optional(),
  profile: z
    .object({ name: text(80), tagline: text(160), bio: text(2000), photoUrl: mediaUrl, cvUrl: z.union([httpUrl, z.literal("")]) })
    .partial()
    .optional(),
});
