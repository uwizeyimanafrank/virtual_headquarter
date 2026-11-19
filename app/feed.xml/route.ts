import { getEnv } from "@/lib/env";
import { getLiveDispatches } from "@/lib/dispatches-public";
import { getSettings } from "@/lib/settings";
import { buildRss } from "@/lib/rss";
import { connectDb } from "@/lib/db";

/** The site's address: APP_URL when set, otherwise what the visitor used (works behind a host's proxy). */
function siteOrigin(request: Request): string {
  const fromEnv = getEnv().APP_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

/** RSS 2.0 feed of the live dispatches (the same list the site shows). */
export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const items = await getLiveDispatches();
  let name = "";
  try { await connectDb(); name = (await getSettings())?.profile?.name ?? ""; } catch { /* no database yet: use the default title */ }
  const xml = buildRss({
    title: name ? `${name}: Dispatches` : "VHQ: Dispatches",
    description: "Short updates from the HQ.",
    siteUrl: `${origin}/dispatches`,
    feedUrl: `${origin}/feed.xml`,
    items: items.map((d) => ({ id: d.id, title: d.title, text: d.text, date: d.date, kind: d.kind, link: `${origin}/dispatches#d-${d.id}` })),
  });
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
