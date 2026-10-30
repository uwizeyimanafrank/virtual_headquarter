import { z } from "zod";
import { ITEM_TYPES } from "@/models/MuseumItem";

/** Shared limits so every form and API route agrees. */
export const LIMITS = { title: 120, description: 4000, name: 80, email: 160, message: 2000, url: 500 } as const;

// Remove invisible control characters and trim. Text is always treated as plain text.
const cleanText = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
const text = (max: number) => z.string().transform(cleanText).pipe(z.string().max(max));

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

// Field rules WITHOUT defaults, so the same rules serve both "create" and "partial update".
const field = {
  type: z.enum(ITEM_TYPES),
  title: text(LIMITS.title).pipe(z.string().min(1)),
  description: text(LIMITS.description),
  mediaUrl,
  parallaxSpeed: z.number().min(0.1).max(1.5),
  date: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "date must be YYYY-MM"),
  status: z.enum(["draft", "published"]),
  order: z.number().int(),
};
const metadataFields = {
  gradeOrLink: z.union([httpUrl, z.literal("")]),
  skills: z.array(text(40).pipe(z.string().min(1))).max(20),
  howIEarnedIt: text(2000),
};

/** Creating an item: sensible defaults for everything except type, title and date. */
export const museumItemInput = z.object({
  type: field.type,
  title: field.title,
  description: field.description.default(""),
  mediaUrl: field.mediaUrl.default(""),
  parallaxSpeed: field.parallaxSpeed.default(0.5),
  date: field.date,
  status: field.status.default("draft"),
  order: field.order.default(0),
  metadata: z
    .object({
      gradeOrLink: metadataFields.gradeOrLink.optional(),
      skills: metadataFields.skills.default([]),
      howIEarnedIt: metadataFields.howIEarnedIt.optional(),
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
  date: field.date.optional(),
  status: field.status.optional(),
  order: field.order.optional(),
  metadata: z
    .object({
      gradeOrLink: metadataFields.gradeOrLink.optional(),
      skills: metadataFields.skills.optional(),
      howIEarnedIt: metadataFields.howIEarnedIt.optional(),
    })
    .optional(),
});

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
  chapterTitles: z
    .object({ about: text(80), certificates: text(80), projects: text(80), library: text(80) })
    .partial()
    .optional(),
  profile: z
    .object({ name: text(80), tagline: text(160), bio: text(2000), photoUrl: mediaUrl })
    .partial()
    .optional(),
});
