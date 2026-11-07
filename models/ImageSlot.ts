import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** The owner's replacement for one image slot (see lib/image-slots.ts). No document = the default picture shows. */
const schema = new Schema(
  {
    key: { type: String, required: true, unique: true, maxlength: 80 },
    publicId: { type: String, default: "", maxlength: 300 }, // Cloudinary id, used to delete the file later
    url: { type: String, required: true, maxlength: 600 }, // Cloudinary address
    alt: { type: String, default: "", maxlength: 200 },
    focal: { x: { type: Number, default: 50, min: 0, max: 100 }, y: { type: Number, default: 50, min: 0, max: 100 } },
    credit: { type: String, default: "", maxlength: 200 },
    license: { type: String, default: "", maxlength: 200 },
    sourceUrl: { type: String, default: "", maxlength: 500 }, // where an imported picture came from
    kind: { type: String, enum: ["upload", "import", "library"], default: "upload" },
  },
  { timestamps: true },
);

export type ImageSlotDoc = InferSchemaType<typeof schema>;
export const ImageSlot: Model<ImageSlotDoc> = (models.ImageSlot as Model<ImageSlotDoc>) || model<ImageSlotDoc>("ImageSlot", schema);
