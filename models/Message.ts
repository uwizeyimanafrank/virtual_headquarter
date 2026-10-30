import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    ipHash: { type: String, default: "", maxlength: 80 }, // hash only, never the raw IP
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

schema.index({ createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof schema>;
export const Message: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) || model<MessageDoc>("Message", schema);
