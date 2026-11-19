import { requireAdmin } from "@/lib/auth-guard";
import { DispatchManager } from "@/components/office/DispatchManager";

export default async function DispatchesPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Dispatches</h1>
      <p className="mb-6 text-muted">Short updates from the HQ. Live ones are public; drafts, scheduled and expired ones are only visible to you.</p>
      <DispatchManager />
    </section>
  );
}
