// Tiny RSS 2.0 writer (P13-T03). Pure: no database, no clock except what you pass in.

export type FeedItem = { id: string; title: string; text: string; date: string; link: string; kind: string };

/** Escape the five XML characters, and drop characters XML 1.0 cannot contain at all. */
export function xml(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** RSS wants RFC 822 dates, in English, in GMT. */
export const rfc822 = (iso: string) => new Date(iso).toUTCString();

export function buildRss(opts: { title: string; description: string; siteUrl: string; feedUrl: string; items: readonly FeedItem[] }): string {
  const newest = opts.items.reduce<string | null>((m, i) => (m === null || i.date > m ? i.date : m), null);
  const items = opts.items
    .map((i) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${xml(i.link)}</link>
      <guid isPermaLink="false">${xml(i.id)}</guid>
      <pubDate>${rfc822(i.date)}</pubDate>
      <category>${xml(i.kind)}</category>
      <description>${xml(i.text)}</description>
    </item>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(opts.title)}</title>
    <link>${xml(opts.siteUrl)}</link>
    <description>${xml(opts.description)}</description>
    <language>en</language>
    ${newest ? `<lastBuildDate>${rfc822(newest)}</lastBuildDate>\n    ` : ""}<atom:link href="${xml(opts.feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
