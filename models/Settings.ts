import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** One single document (key "main") that holds site-wide wording and switches. */
const schema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    heroTitle: { type: String, default: "Discipline over luck.", maxlength: 160 },
    heroText: {
      type: String,
      default:
        "Vision sets the direction. Execution decides the result. Take the tour and judge the work yourself.",
      maxlength: 600,
    },
    chapterTitles: {
      about: { type: String, default: "The Person Behind the Work", maxlength: 80 },
      certificates: { type: String, default: "Proof", maxlength: 80 },
      projects: { type: String, default: "The Execution", maxlength: 80 },
      library: { type: String, default: "Books and References", maxlength: 80 },
    },
    profile: {
      name: { type: String, default: "", maxlength: 80 },
      tagline: { type: String, default: "", maxlength: 160 },
      bio: { type: String, default: "", maxlength: 2000 },
      photoUrl: { type: String, default: "", maxlength: 500 },
    },
    onboarding: {
      completed: { type: Boolean, default: false },
      steps: { type: Schema.Types.Mixed, default: {} }, // { stepKey: "done" | "skipped" }
      tourSeen: { type: Boolean, default: false },
      samplesSeeded: { type: Boolean, default: false }, // sample content was created once, never re-created by itself
      profileIsSample: { type: Boolean, default: false }, // profile fields currently hold sample text
    },
    showSamples: { type: Boolean, default: true },
    autoHideSamples: { type: Boolean, default: true }, // hide samples of a type once a real item of that type is published
    theme: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof schema>;
export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>("Settings", schema);
