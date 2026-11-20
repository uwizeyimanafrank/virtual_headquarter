/** A gallery picture as the Office sees it (drafts too). album = album id or "". takenDate = YYYY-MM-DD or "". */
export type AdminGalleryImage = { id: string; imageUrl: string; caption: string; alt: string; album: string; takenDate: string; order: number; published: boolean };
export type AdminAlbum = { id: string; title: string; description: string; order: number };

export const toAdminGalleryImage = (d: { _id: unknown; imageUrl: string; caption?: string | null; alt: string; album?: unknown; takenDate?: Date | null; order?: number | null; published?: boolean | null }): AdminGalleryImage => ({
  id: String(d._id),
  imageUrl: d.imageUrl,
  caption: d.caption ?? "",
  alt: d.alt,
  album: d.album ? String(d.album) : "",
  takenDate: d.takenDate ? new Date(d.takenDate).toISOString().slice(0, 10) : "",
  order: d.order ?? 0,
  published: Boolean(d.published),
});

export const toAdminAlbum = (d: { _id: unknown; title: string; description?: string | null; order?: number | null }): AdminAlbum => ({
  id: String(d._id), title: d.title, description: d.description ?? "", order: d.order ?? 0,
});
