import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ITEM_TYPES = ["project", "certificate", "story", "book", "reference"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

const schema = new Schema(
  {
    type: { type: String, enum: ITEM_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 4000 },
    mediaUrl: { type: String, default: "", maxlength: 500 },
    parallaxSpeed: { type: Number, default: 0.5, min: 0.1, max: 1.5 },
    date: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // YYYY-MM
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    order: { type: Number, default: 0 },
    isSample: { type: Boolean, default: false },
    metadata: {
      gradeOrLink: {
        type: String,
        maxlength: 500,
        validate: {
          validator: (v: string | undefined) => !v || /^https?:\/\/\S+$/i.test(v),
          message: "gradeOrLink must be a valid web address",
        },
      },
      skills: { type: [{ type: String, maxlength: 40 }], default: [] },
      howIEarnedIt: { type: String, maxlength: 2000 },
    },
  },
  { timestamps: true },
);

schema.index({ type: 1, status: 1, order: 1 });
schema.index({ status: 1, date: -1 });

export type MuseumItemDoc = InferSchemaType<typeof schema>;
export const MuseumItem: Model<MuseumItemDoc> =
  (models.MuseumItem as Model<MuseumItemDoc>) || model<MuseumItemDoc>("MuseumItem", schema);
