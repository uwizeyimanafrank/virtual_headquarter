import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const AUDIT_EVENTS = [
  "login_password", "login_fail", "login_2fa", "login_2fa_fail", "enroll_2fa", "stepup", "stepup_fail",
  "logout", "session_revoke", "sessions_revoke_all", "panic", "vault_open", "delete", "settings_change",
  "service_down", "service_up", "service_change",
  "vault_change",
] as const;

const schema = new Schema({
  event: { type: String, enum: AUDIT_EVENTS, required: true },
  ok: { type: Boolean, required: true },
  ipHash: { type: String, default: "" },
  deviceLabel: { type: String, default: "", maxlength: 80 },
  detail: { type: String, default: "", maxlength: 200 }, // short note, never secrets
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180, index: true }, // kept 180 days
});

export type AuditLogDoc = InferSchemaType<typeof schema>;
export const AuditLog: Model<AuditLogDoc> =
  (models.AuditLog as Model<AuditLogDoc>) || model<AuditLogDoc>("AuditLog", schema);
