import { parseKind } from "@/lib/dispatches";
import { getLiveDispatches } from "@/lib/dispatches-public";

/** Public list of LIVE dispatches: published, already started, not expired. Drafts and scheduled items never leave the server. */
export async function GET(request: Request) {
  const kindParam = new URL(request.url).searchParams.get("kind");
  const kind = parseKind(kindParam);
  if (kindParam && !kind) return Response.json({ error: "Unknown kind" }, { status: 400 });

  const all = await getLiveDispatches();
  const items = kind ? all.filter((d) => d.kind === kind) : all;

  // Short cache: an item that expires can stay up to a minute (plus stale time) after its expiry moment.
  return Response.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
