import { describe, expect, it } from "vitest";
import { buildRss, rfc822, xml } from "@/lib/rss";
import { KIND_LABELS, formatDispatchDate, DISPATCH_KINDS } from "@/lib/dispatches";

const item = { id: "a1", title: "Tom & Jerry <3 \"quotes\"", text: "x < y && 'z'", date: "2026-11-20T10:00:00.000Z", link: "https://example.test/dispatches#d-a1", kind: "news" };

describe("xml", () => {
  it("escapes the five XML characters and drops characters XML cannot hold", () => {
    expect(xml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;");
    expect(xml("a\u0000b\u0008c")).toBe("abc");
  });
});

describe("buildRss", () => {
  const out = buildRss({ title: "T", description: "D", siteUrl: "https://example.test/dispatches", feedUrl: "https://example.test/feed.xml", items: [item, { ...item, id: "b2", date: "2026-11-25T00:00:00.000Z" }] });
  it("is an RSS 2.0 document with a self link and one item per dispatch", () => {
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(out).toContain('<rss version="2.0"');
    expect(out).toContain('<atom:link href="https://example.test/feed.xml" rel="self" type="application/rss+xml" />');
    expect(out.match(/<item>/g)).toHaveLength(2);
  });
  it("escapes titles and text so the feed stays well-formed", () => {
    expect(out).toContain("<title>Tom &amp; Jerry &lt;3 &quot;quotes&quot;</title>");
    expect(out).not.toMatch(/<title>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
  it("uses RFC 822 dates and the newest date as lastBuildDate", () => {
    expect(rfc822("2026-11-20T10:00:00.000Z")).toBe("Fri, 20 Nov 2026 10:00:00 GMT");
    expect(out).toContain("<lastBuildDate>Wed, 25 Nov 2026 00:00:00 GMT</lastBuildDate>");
  });
  it("is still a valid feed with no items, and has no lastBuildDate", () => {
    const empty = buildRss({ title: "T", description: "D", siteUrl: "s", feedUrl: "f", items: [] });
    expect(empty).toContain("</channel>");
    expect(empty).not.toContain("<item>");
    expect(empty).not.toContain("lastBuildDate");
  });
});

describe("dispatch labels", () => {
  it("has a label for every kind", () => { for (const k of DISPATCH_KINDS) expect(KIND_LABELS[k]).toBeTruthy(); });
  it("prints dates in UTC so server and browser agree", () => { expect(formatDispatchDate("2026-11-20T23:59:00.000Z")).toBe("20 Nov 2026"); });
});
