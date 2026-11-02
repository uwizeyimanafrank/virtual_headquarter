import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { SAMPLE_PROFILE } from "@/lib/samples-data";
import { getSettingsView } from "@/lib/admin-settings";
import { invalidateHome } from "@/lib/home";
import { invalidateMuseum } from "@/lib/museum";
import { getSettings } from "@/lib/settings";
import { settingsPatch } from "@/lib/validation";
import { Settings } from "@/models/Settings";

export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  return Response.json(await getSettingsView(), { headers: { "Cache-Control": "no-store" } });
}

/** Edit hero text, chapter titles and profile. Only the fields you send change. */
export async function PATCH(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = settingsPatch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  const { heroTitle, heroText, twinAvatarUrl, chapterTitles, profile } = parsed.data;
  const $set: Record<string, unknown> = {};
  if (heroTitle !== undefined) $set.heroTitle = heroTitle;
  if (heroText !== undefined) $set.heroText = heroText;
  if (twinAvatarUrl !== undefined) $set.twinAvatarUrl = twinAvatarUrl;
  for (const [k, v] of Object.entries(chapterTitles ?? {})) if (v !== undefined) $set[`chapterTitles.${k}`] = v;
  for (const [k, v] of Object.entries(profile ?? {})) if (v !== undefined) $set[`profile.${k}`] = v;
  if (Object.keys($set).length === 0) return Response.json({ error: "Nothing to change." }, { status: 400 });

  await connectDb();
  await getSettings();
  await Settings.updateOne({ key: "main" }, { $set });

  // The profile only counts as "real" once none of its fields still holds the sample text.
  if (profile) {
    const s = await getSettings();
    const stillSample = (["name", "tagline", "bio", "photoUrl"] as const).some((k) => s?.profile?.[k] === SAMPLE_PROFILE[k]);
    await Settings.updateOne({ key: "main" }, { $set: { "onboarding.profileIsSample": stillSample } });
  }
  invalidateHome();
  invalidateMuseum();
  await audit("settings_change", true, request.headers, Object.keys($set).map((k) => k.split(".")[0]).filter((v, i, a) => a.indexOf(v) === i).join(","));
  return Response.json(await getSettingsView(), { headers: { "Cache-Control": "no-store" } });
}
