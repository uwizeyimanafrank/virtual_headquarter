/** Shape of a Museum item as the Office sees it (drafts and samples included). */
export type AdminItem = {
  id: string; type: string; title: string; description: string; mediaUrl: string; parallaxSpeed: number;
  date: string; status: "draft" | "published"; order: number; isSample: boolean;
  metadata: { gradeOrLink: string; skills: string[]; howIEarnedIt: string };
};

export const toAdminItem = (d: {
  _id: unknown; type: string; title: string; description?: string | null; mediaUrl?: string | null; parallaxSpeed?: number | null;
  date: string; status?: string | null; order?: number | null; isSample?: boolean | null;
  metadata?: { gradeOrLink?: string | null; skills?: string[] | null; howIEarnedIt?: string | null } | null;
}): AdminItem => ({
  id: String(d._id),
  type: d.type,
  title: d.title,
  description: d.description ?? "",
  mediaUrl: d.mediaUrl ?? "",
  parallaxSpeed: d.parallaxSpeed ?? 0.5,
  date: d.date,
  status: d.status === "published" ? "published" : "draft",
  order: d.order ?? 0,
  isSample: Boolean(d.isSample),
  metadata: { gradeOrLink: d.metadata?.gradeOrLink ?? "", skills: d.metadata?.skills ?? [], howIEarnedIt: d.metadata?.howIEarnedIt ?? "" },
});
