import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** Server-side login sessions. Only the SHA-256 hash of the cookie token is stored. */
const schema = new Schema({
  adminId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  prevTokenHash: { type: String, default: "" }, // old token stays valid for a minute after rotation
  prevValidUntil: { type: Date, default: null },
  stage: { type: String, enum: ["pending", "enroll", "full"], required: true },
  deviceLabel: { type: String, default: "", maxlength: 80 },
  ipHash: { type: String, default: "" },
  createdAt: { type: Date, required: true },
  lastSeen: { type: Date, required: true },
  rotatedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  twoFactorAt: { type: Date, default: null }, // last time 2FA was proven (step-up checks this)
  revoked: { type: Boolean, default: false },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // cleanup one day after expiry

export type SessionDoc = InferSchemaType<typeof schema>;
export const Session: Model<SessionDoc> =
  (models.Session as Model<SessionDoc>) || model<SessionDoc>("Session", schema);
