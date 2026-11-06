import { VaultPanel } from "@/components/office/VaultPanel";
import { requireAdmin } from "@/lib/auth-guard";

export default async function Page() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="text-2xl font-semibold">Vault</h1>
      <p className="mt-2 max-w-prose text-muted">Zero-knowledge storage for your .env files and secrets. Locked and unlocked in your browser only.</p>
      <div className="mt-6"><VaultPanel /></div>
    </section>
  );
}
