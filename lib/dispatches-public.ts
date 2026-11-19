import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connectDb } from "@/lib/db";
import { selectLive, type DispatchKind } from "@/lib/dispatches";
import { SAMPLE_DISPATCHES } from "@/lib/dispatches-samples";
import { HOME_TAG } from "@/lib/home";
import { applySampleRules } from "@/lib/samples-data";
import { getSettings } from "@/lib/settings";
import { Dispatch } from "@/models/Dispatch";

/** A live dispatch as visitors see it. Dates are ISO text so the value can be cached. */
export type PublicDispatch = { id: string; title: string; text: string; kind: DispatchKind; imageUrl: string; video: string; date: string; pinned: boolean };

/**
 * Every LIVE dispatch (published, started, not expired), pinned first then newest, with the sample switches applied.
 * Cached for a minute and refreshed by invalidateHome(), so an expiring item leaves within a minute at most.
 * Home, /dispatches, the feed and GET /api/dispatches all read through here, so they always agree.
 */
export async function getLiveDispatches(): Promise<PublicDispatch[]> {
  "use cache";
  cacheTag(HOME_TAG);
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  try {
    await connectDb();
    const [docs, settings] = await Promise.all([Dispatch.find({ published: true }).lean(), getSettings()]);
    const live = applySampleRules(
      selectLive(docs, new Date()).map((d) => ({ ...d, type: "dispatch" })),
      { showSamples: settings?.showSamples ?? true, autoHide: settings?.autoHideSamples ?? true },
    );
    return live.map((d) => ({
      id: String(d._id), title: d.title, text: d.text ?? "", kind: d.kind as DispatchKind,
      imageUrl: d.imageUrl ?? "", video: d.video ?? "", date: d.date.toISOString(), pinned: !!d.pinned,
    }));
  } catch (err) {
    // No database yet: show the same three samples the Office would create, so the site is never empty.
    console.error("dispatches unavailable, showing samples:", err instanceof Error ? err.message : "unknown error");
    return SAMPLE_DISPATCHES.map((s, i) => ({ id: `demo-${i}`, title: s.title, text: s.text, kind: s.kind, imageUrl: "", video: "", date: new Date(Date.UTC(2026, 0, 1) - i * 86400000).toISOString(), pinned: false }));
  }
}
