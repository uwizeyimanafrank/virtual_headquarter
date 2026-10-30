import "server-only";
import { connectDb } from "@/lib/db";
import { hasEnv } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { AdminUser } from "@/models/AdminUser";
import { MuseumItem } from "@/models/MuseumItem";
import { Settings } from "@/models/Settings";

export const STEP_KEYS = [
  "profilePhoto", "about", "documents", "firstCertificate", "firstProject",
  "database", "cloudinaryGemini", "secureOffice", "firstVaultEntry",
] as const;
export type StepKey = (typeof STEP_KEYS)[number];

/** `href` is relative to the Office address (the page adds the secret slug). */
const DEFS: Record<StepKey, { title: string; desc: string; href: string }> = {
  profilePhoto: { title: "Add your profile photo", desc: "Upload a photo of you. It is used on Home and in the Museum intro.", href: "/settings" },
  about: { title: "Write about you", desc: "Name, one-line tagline and a short bio.", href: "/settings" },
  documents: { title: "Add your documents", desc: "CV, certificates and reference letters you want to keep here.", href: "/content" },
  firstCertificate: { title: "Add your first certificate", desc: "Include the story of how you earned it.", href: "/content" },
  firstProject: { title: "Add your first project", desc: "What it does, what you used, what you learned.", href: "/content" },
  database: { title: "Connect your database", desc: "Check that MongoDB is connected.", href: "/setup/doctor" },
  cloudinaryGemini: { title: "Connect Cloudinary and Gemini", desc: "Cloudinary stores your images. Gemini powers the AI Twin.", href: "/setup/doctor" },
  secureOffice: { title: "Secure the Office", desc: "Turn on 2FA and save your recovery codes.", href: "/security" },
  firstVaultEntry: { title: "Try the vault", desc: "Optional: store one .env file to learn how it works.", href: "/vault" },
};

export type ChecklistItem = {
  key: StepKey; title: string; desc: string; href: string;
  done: boolean; skipped: boolean; auto: boolean; // auto = detected by itself, no button needed
};

const isReal = (url: string | undefined | null) => Boolean(url) && !String(url).startsWith("/samples/");

export async function getChecklist() {
  await connectDb();
  const settings = await getSettings();
  const manual = (settings?.onboarding?.steps ?? {}) as Record<string, string>;
  const [cert, project, totp] = await Promise.all([
    MuseumItem.exists({ type: "certificate", isSample: { $ne: true } }),
    MuseumItem.exists({ type: "project", isSample: { $ne: true } }),
    AdminUser.exists({ totpEnabled: true }),
  ]);
  const p = settings?.profile;
  const profileIsSample = Boolean(settings?.onboarding?.profileIsSample);

  const detected: Partial<Record<StepKey, boolean>> = {
    profilePhoto: isReal(p?.photoUrl),
    about: !profileIsSample && Boolean(p?.name && p?.bio),
    firstCertificate: Boolean(cert),
    firstProject: Boolean(project),
    database: true, // we are reading from it right now
    cloudinaryGemini: hasEnv("CLOUDINARY_CLOUD_NAME") && hasEnv("CLOUDINARY_API_KEY") && hasEnv("CLOUDINARY_API_SECRET") && hasEnv("GEMINI_API_KEY"),
    secureOffice: Boolean(totp),
  };

  const items: ChecklistItem[] = STEP_KEYS.map((key) => {
    const auto = key in detected;
    const done = (detected[key] ?? false) || manual[key] === "done";
    return { key, ...DEFS[key], auto, done, skipped: !done && manual[key] === "skipped" };
  });
  const doneCount = items.filter((i) => i.done).length;
  return {
    items,
    doneCount,
    total: items.length,
    finished: items.every((i) => i.done || i.skipped),
    tourSeen: Boolean(settings?.onboarding?.tourSeen),
  };
}

export async function setStepState(step: StepKey, state: "done" | "skipped" | "clear") {
  await connectDb();
  await getSettings();
  if (state === "clear") await Settings.updateOne({ key: "main" }, { $unset: { [`onboarding.steps.${step}`]: "" } });
  else await Settings.updateOne({ key: "main" }, { $set: { [`onboarding.steps.${step}`]: state } });
}

export async function setTourSeen(seen: boolean) {
  await connectDb();
  await getSettings();
  await Settings.updateOne({ key: "main" }, { $set: { "onboarding.tourSeen": seen } });
}
