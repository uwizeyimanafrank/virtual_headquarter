import "server-only";
import { getSettings } from "@/lib/settings";

export type SettingsView = {
  heroTitle: string; heroText: string; twinAvatarUrl: string;
  chapterTitles: { about: string; certificates: string; projects: string; library: string };
  profile: { name: string; tagline: string; bio: string; photoUrl: string };
  profileIsSample: boolean;
};

/** Editable site settings in a plain shape (used by the settings page and the settings API). */
export async function getSettingsView(): Promise<SettingsView> {
  const s = await getSettings();
  return {
    heroTitle: s?.heroTitle ?? "",
    heroText: s?.heroText ?? "",
    twinAvatarUrl: s?.twinAvatarUrl ?? "",
    chapterTitles: { about: s?.chapterTitles?.about ?? "", certificates: s?.chapterTitles?.certificates ?? "", projects: s?.chapterTitles?.projects ?? "", library: s?.chapterTitles?.library ?? "" },
    profile: { name: s?.profile?.name ?? "", tagline: s?.profile?.tagline ?? "", bio: s?.profile?.bio ?? "", photoUrl: s?.profile?.photoUrl ?? "" },
    profileIsSample: Boolean(s?.onboarding?.profileIsSample),
  };
}
