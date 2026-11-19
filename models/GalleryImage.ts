import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 }, // Cloudinary only (checked by zod); location data was removed before upload
    caption: { type: String, default: "", trim: true, maxlength: 200 },
    // Alt text is REQUIRED: it is what a screen reader says for the picture. A picture without it cannot be saved.
    alt: { type: String, required: [true, "Alt text is required"], trim: true, minlength: 1, maxlength: 200 },
    album: { type: Schema.Types.ObjectId, ref: "Album", default: null }, // null = not in an album
    takenDate: { type: Date, default: null }, // when the picture was taken, typed by the owner (never read from the file)
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ published: 1, album: 1, order: 1 });

export type GalleryImageDoc = InferSchemaType<typeof schema>;
export const GalleryImage: Model<GalleryImageDoc> =
  (models.GalleryImage as Model<GalleryImageDoc>) || model<GalleryImageDoc>("GalleryImage", schema);
