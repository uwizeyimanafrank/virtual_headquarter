import { ITEM_TYPES } from "@/lib/item-types";

/**
 * The ONLY facts the AI Twin is given about the site: numbers and statuses.
 * Never emails, message text, titles, passwords, keys, database addresses or vault contents.
 * `buildTwinContext` copies just the allowed fields from whatever it is handed, so even if the
 * collecting code is changed by mistake, nothing else can slip through to the AI.
 */
export type TwinContext = {
  generatedAt: string;
  items: { total: number; samples: number; byType: Record<string, { published: number; draft: number }> };
  messages: { unread: number };
  database: { dataBytes: number | null; storageBytes: number | null };
  media: { configured: boolean; storageBytes: number | null };
  lastLoginAt: string | null;
};

const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const bytes = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
const iso = (v: unknown): string | null => {
  const d = v instanceof Date ? v : typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function buildTwinContext(raw: unknown, now: Date = new Date()): TwinContext {
  const r = obj(raw);
  const items = obj(r.items);
  const byTypeIn = obj(items.byType);
  const byType: TwinContext["items"]["byType"] = {};
  let total = 0;
  for (const t of ITEM_TYPES) {
    const e = obj(byTypeIn[t]);
    byType[t] = { published: count(e.published), draft: count(e.draft) };
    total += byType[t].published + byType[t].draft;
  }
  const db = obj(r.database);
  const media = obj(r.media);
  return {
    generatedAt: now.toISOString(),
    items: { total, samples: count(items.samples), byType },
    messages: { unread: count(obj(r.messages).unread) },
    database: { dataBytes: bytes(db.dataBytes), storageBytes: bytes(db.storageBytes) },
    media: { configured: media.configured === true, storageBytes: bytes(media.storageBytes) },
    lastLoginAt: iso(r.lastLoginAt),
  };
}
