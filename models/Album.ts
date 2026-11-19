import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A chapter of the public gallery. Pictures point to it; deleting an album must not delete pictures (T05 moves them out). */
const schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 300 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

schema.index({ order: 1 });

export type AlbumDoc = InferSchemaType<typeof schema>;
export const Album: Model<AlbumDoc> = (models.Album as Model<AlbumDoc>) || model<AlbumDoc>("Album", schema);
