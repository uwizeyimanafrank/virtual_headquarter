import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

import { HIRE_KINDS, HIRE_STATUSES } from "@/lib/hire-kinds";

/** Someone who wants to work together. Plain text only; nothing is emailed, the Office inbox is the only place it shows (P14-T03). */
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    company: { type: String, default: "", trim: true, maxlength: 120 },
    kind: { type: String, enum: HIRE_KINDS, required: true },
    budget: { type: String, default: "", trim: true, maxlength: 80 },
    timeline: { type: String, default: "", trim: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 3000 },
    links: { type: [{ type: String, maxlength: 300 }], default: [], validate: [(v: string[]) => v.length <= 5, "at most 5 links"] },
    // Owner side (P14-T03): where the request stands, a star for priority, private notes, and whether it was opened.
    status: { type: String, enum: HIRE_STATUSES, default: "new" },
    priority: { type: Boolean, default: false },
    notes: { type: String, default: "", maxlength: 2000 },
    read: { type: Boolean, default: false },
    ipHash: { type: String, default: "", maxlength: 80 }, // hash only, never the raw IP
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

schema.index({ createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });

export type HireRequestDoc = InferSchemaType<typeof schema>;
export const HireRequest: Model<HireRequestDoc> = (models.HireRequest as Model<HireRequestDoc>) || model<HireRequestDoc>("HireRequest", schema);
