import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const SERVICE_TYPES = ["http", "mongodb", "cloudinary", "render"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Something the Developer tab watches. Credentials are stored encrypted and are never sent back to the browser. */
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: SERVICE_TYPES, required: true },
    baseUrl: { type: String, default: "", maxlength: 300 }, // only for type "http"
    healthPath: { type: String, default: "/", maxlength: 200 },
    enabled: { type: Boolean, default: true },
    limitBytes: { type: Number, default: null }, // optional storage limit shown as a progress bar
    credentialEnc: { type: String, default: "" }, // AES-256-GCM, see lib/crypto-server.ts
    lastCheck: {
      at: { type: Date, default: null },
      status: { type: String, enum: ["up", "degraded", "down", "unknown"], default: "unknown" },
      message: { type: String, default: "", maxlength: 200 },
      metrics: { type: [Schema.Types.Mixed], default: [] },
    },
  },
  { timestamps: true },
);

export type ServiceDoc = InferSchemaType<typeof schema>;
export const Service: Model<ServiceDoc> = (models.Service as Model<ServiceDoc>) || model<ServiceDoc>("Service", schema);
