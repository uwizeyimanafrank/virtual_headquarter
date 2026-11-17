import { normalizeDisplay, type DisplayMode } from "@/lib/item-types";
/** Shape of a Museum item as the Office sees it (drafts and samples included). */
export type AdminItem = {
  id: string; type: string; title: string; description: string; mediaUrl: string; parallaxSpeed: number;
  display: DisplayMode; gallery: string[]; video: string;
  date: string; status: "draft" | "published"; order: number; isSample: boolean;
  metadata: { gradeOrLink: string; skills: string[]; howIEarnedIt: string; problem: string; whatIDid: string; result: string; featured: boolean };
};

export const toAdminItem = (d: {
  _id: unknown; type: string; title: string; description?: string | null; mediaUrl?: string | null; parallaxSpeed?: number | null;
  display?: string | null; gallery?: string[] | null; video?: string | null;
  date: string; status?: string | null; order?: number | null; isSample?: boolean | null;
  metadata?: { gradeOrLink?: string | null; skills?: string[] | null; howIEarnedIt?: string | null; problem?: string | null; whatIDid?: string | null; result?: string | null; featured?: boolean | null } | null;
}): AdminItem => ({
  id: String(d._id),
  type: d.type,
  title: d.title,
  description: d.description ?? "",
  mediaUrl: d.mediaUrl ?? "",
  parallaxSpeed: d.parallaxSpeed ?? 0.5,
  display: normalizeDisplay(d.display),
  gallery: d.gallery ?? [],
  video: d.video ?? "",
  date: d.date,
  status: d.status === "published" ? "published" : "draft",
  order: d.order ?? 0,
  isSample: Boolean(d.isSample),
  metadata: { gradeOrLink: d.metadata?.gradeOrLink ?? "", skills: d.metadata?.skills ?? [], howIEarnedIt: d.metadata?.howIEarnedIt ?? "", problem: d.metadata?.problem ?? "", whatIDid: d.metadata?.whatIDid ?? "", result: d.metadata?.result ?? "", featured: Boolean(d.metadata?.featured) },
});
