import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** The single owner account of the Office. */
const schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true }, // argon2id hash, never the password
    totpEnabled: { type: Boolean, default: false },
    totpSecretEnc: { type: String, default: "" }, // AES-256-GCM encrypted, see lib/crypto-server.ts
    totpPendingEnc: { type: String, default: "" }, // secret shown at enrolment, not active until confirmed
    lastTotpStep: { type: Number, default: 0 }, // blocks re-using the same 6-digit code
    recoveryCodeHashes: { type: [String], default: [] }, // sha256 of one-time codes
    passkeys: { type: [Schema.Types.Mixed], default: [] }, // reserved for WebAuthn (later)
    lockedUntil: { type: Date, default: null }, // set by the panic button
  },
  { timestamps: true },
);

export type AdminUserDoc = InferSchemaType<typeof schema>;
export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) || model<AdminUserDoc>("AdminUser", schema);
