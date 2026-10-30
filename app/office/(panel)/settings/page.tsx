import { requireAdmin } from "@/lib/auth-guard";
import { getSettingsView } from "@/lib/admin-settings";
import { SettingsForm } from "@/components/office/SettingsForm";

export default async function SettingsPage() {
  await requireAdmin(); // first line of every Office page
  const initial = await getSettingsView();
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Settings</h1>
      <p className="mb-6 text-muted">Your profile and the wording of the public site.</p>
      <SettingsForm initial={initial} />
    </section>
  );
}
