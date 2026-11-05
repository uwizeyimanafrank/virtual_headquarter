import { requireAdmin } from "@/lib/auth-guard";
import { StorageLibrary } from "@/components/office/StorageLibrary";

export default async function LibraryPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Storage library</h1>
      <p className="mb-6 text-muted">How much space your database, media and other services use.</p>
      <StorageLibrary />
    </section>
  );
}
