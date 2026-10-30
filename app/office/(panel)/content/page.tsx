import { requireAdmin } from "@/lib/auth-guard";
import { ContentManager } from "@/components/office/ContentManager";

export default async function ContentPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Content</h1>
      <p className="mb-6 text-muted">Everything visitors see in the Museum. Published items are public, drafts are only visible to you.</p>
      <ContentManager />
    </section>
  );
}
