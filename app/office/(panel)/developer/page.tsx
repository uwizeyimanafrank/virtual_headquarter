import Link from "next/link";
import { adminBase } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import { DeveloperPanel } from "@/components/office/DeveloperPanel";

export default async function DeveloperPage() {
  await requireAdmin(); // first line of every Office page
  const base = adminBase();
  const link = "rounded-xl border border-line px-4 py-2 text-sm hover:bg-surface-strong";
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Developer</h1>
      <p className="mb-4 text-muted">Everything you run, in one place. Add any service without touching code.</p>
      <p className="mb-6 flex flex-wrap gap-2"><Link className={link} href={`${base}/developer/library`}>Storage library</Link><Link className={link} href={`${base}/developer/reminder`}>System reminder</Link></p>
      <DeveloperPanel />
    </section>
  );
}
