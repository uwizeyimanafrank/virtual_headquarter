import { requireAdmin } from "@/lib/auth-guard";
import { GalleryManager } from "@/components/office/GalleryManager";

export default async function GalleryPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Gallery</h1>
      <p className="mb-6 text-muted">Upload many pictures at once, give each one alt text, and put them in albums. Only published pictures are public.</p>
      <GalleryManager />
    </section>
  );
}
