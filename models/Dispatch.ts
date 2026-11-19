import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

import { DISPATCH_KINDS } from "@/lib/dispatches";

const schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    text: { type: String, default: "", maxlength: 600 }, // short on purpose
    kind: { type: String, enum: DISPATCH_KINDS, default: "note" },
    imageUrl: { type: String, default: "", maxlength: 500 }, // optional Cloudinary image
    video: { type: String, default: "", maxlength: 500 }, // optional Cloudinary video
    date: { type: Date, required: true, default: Date.now }, // the date shown on the card
    pinned: { type: Boolean, default: false },
    publishAt: { type: Date, default: null }, // not shown before this moment
    expireAt: { type: Date, default: null }, // not shown from this moment on
    published: { type: Boolean, default: false },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ published: 1, pinned: -1, date: -1 });

export type DispatchDoc = InferSchemaType<typeof schema>;
export const Dispatch: Model<DispatchDoc> =
  (models.Dispatch as Model<DispatchDoc>) || model<DispatchDoc>("Dispatch", schema);
