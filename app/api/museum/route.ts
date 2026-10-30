import { connectDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { applySampleRules } from "@/lib/samples-data";
import { MuseumItem, ITEM_TYPES, type ItemType } from "@/models/MuseumItem";

// Story chapter first, then proofs, then execution, then reading list.
const TYPE_ORDER: Record<ItemType, number> = { story: 0, certificate: 1, project: 2, book: 3, reference: 4 };

/** Public list of PUBLISHED Museum items. Drafts never leave the server. */
export async function GET(request: Request) {
  const typeParam = new URL(request.url).searchParams.get("type");
  const type = ITEM_TYPES.find((t) => t === typeParam);
  if (typeParam && !type) return Response.json({ error: "Unknown type" }, { status: 400 });

  await connectDb();
  const settings = await getSettings();
  const filter: Record<string, unknown> = { status: "published" };
  if (type) filter.type = type;

  const all = await MuseumItem.find(filter).lean();
  // Samples follow the Office switches: hidden entirely, or hidden per type once real items exist.
  const docs = applySampleRules(all, {
    showSamples: settings?.showSamples ?? true,
    autoHide: settings?.autoHideSamples ?? true,
  });
  docs.sort(
    (a, b) =>
      TYPE_ORDER[a.type as ItemType] - TYPE_ORDER[b.type as ItemType] ||
      (a.order ?? 0) - (b.order ?? 0) ||
      b.date.localeCompare(a.date),
  );

  const items = docs.map((d) => ({
    id: String(d._id),
    type: d.type,
    title: d.title,
    description: d.description,
    mediaUrl: d.mediaUrl,
    parallaxSpeed: d.parallaxSpeed,
    date: d.date,
    metadata: {
      gradeOrLink: d.metadata?.gradeOrLink ?? "",
      skills: d.metadata?.skills ?? [],
      howIEarnedIt: d.metadata?.howIEarnedIt ?? "",
    },
  }));

  return Response.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
