import type { DispatchKind } from "@/lib/dispatches";

/** A dispatch as the Office sees it (drafts, scheduled and samples included). Dates are text: date = YYYY-MM-DD, others ISO or "". */
export type AdminDispatch = {
  id: string; title: string; text: string; kind: DispatchKind; imageUrl: string; video: string;
  date: string; pinned: boolean; publishAt: string; expireAt: string; published: boolean; isSample: boolean;
};

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : "");

export const toAdminDispatch = (d: {
  _id: unknown; title: string; text?: string | null; kind?: string | null; imageUrl?: string | null; video?: string | null;
  date: Date; pinned?: boolean | null; publishAt?: Date | null; expireAt?: Date | null; published?: boolean | null; isSample?: boolean | null;
}): AdminDispatch => ({
  id: String(d._id),
  title: d.title,
  text: d.text ?? "",
  kind: (d.kind ?? "note") as DispatchKind,
  imageUrl: d.imageUrl ?? "",
  video: d.video ?? "",
  date: iso(d.date).slice(0, 10),
  pinned: Boolean(d.pinned),
  publishAt: iso(d.publishAt),
  expireAt: iso(d.expireAt),
  published: Boolean(d.published),
  isSample: Boolean(d.isSample),
});

/** Where a dispatch stands right now, for the badge in the list. */
export function dispatchState(d: Pick<AdminDispatch, "published" | "publishAt" | "expireAt">, now: Date): "draft" | "scheduled" | "live" | "expired" {
  if (!d.published) return "draft";
  if (d.publishAt && new Date(d.publishAt) > now) return "scheduled";
  if (d.expireAt && new Date(d.expireAt) <= now) return "expired";
  return "live";
}
