import { requireAdmin } from "@/lib/auth-guard";
import { DoctorPanel } from "@/components/office/DoctorPanel";

export default async function DoctorPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Config Doctor</h1>
      <p className="mb-6 text-muted">Checks your connections and explains problems in plain words.</p>
      <DoctorPanel />
    </section>
  );
}
