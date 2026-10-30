import { requireAdmin } from "@/lib/auth-guard";
import { SecurityPanel } from "@/components/office/SecurityPanel";

export default async function SecurityPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Security</h1>
      <SecurityPanel />
    </section>
  );
}
