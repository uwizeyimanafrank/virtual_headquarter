import { connectDb } from "@/lib/db";
import { parseKind, selectLive } from "@/lib/dispatches";
import { getSettings } from "@/lib/settings";
import { applySampleRules } from "@/lib/samples-data";
import { Dispatch } from "@/models/Dispatch";

/** Public list of LIVE dispatches: published, already started, not expired. Drafts and scheduled items never leave the server. */
export async function GET(request: Request) {
  const kindParam = new URL(request.url).searchParams.get("kind");
  const kind = parseKind(kindParam);
  if (kindParam && !kind) return Response.json({ error: "Unknown kind" }, { status: 400 });

  await connectDb();
  // The database narrows by kind and published; the live rule is applied in code with one clock reading.
  const filter: Record<string, unknown> = { published: true };
  if (kind) filter.kind = kind;
  const docs = await Dispatch.find(filter).lean();

  // Samples follow the Office switches, same as the Museum: hidden entirely, or hidden once a real dispatch is live.
  const settings = await getSettings();
  const live = applySampleRules(
    selectLive(docs, new Date()).map((d) => ({ ...d, type: "dispatch" })),
    { showSamples: settings?.showSamples ?? true, autoHide: settings?.autoHideSamples ?? true },
  );

  const items = live.map((d) => ({
    id: String(d._id),
    title: d.title,
    text: d.text ?? "",
    kind: d.kind,
    imageUrl: d.imageUrl ?? "",
    video: d.video ?? "",
    date: d.date.toISOString(),
    pinned: !!d.pinned,
  }));

  // Short cache: an item that expires can stay up to a minute (plus stale time) after its expiry moment.
  return Response.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
