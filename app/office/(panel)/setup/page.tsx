import { requireAdmin } from "@/lib/auth-guard";
import { SampleBanner } from "@/components/office/SampleBanner";
import { SetupChecklist } from "@/components/office/SetupChecklist";

export default async function SetupPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Setup</h1>
      <p className="mb-6 text-muted">Everything to get your site ready. Skip anything and come back later.</p>
      <SampleBanner />
      <SetupChecklist />
    </section>
  );
}
