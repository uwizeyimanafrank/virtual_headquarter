import Link from "next/link";
import { adminBase } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { Message } from "@/models/Message";
import { SampleBanner } from "@/components/office/SampleBanner";
import { SetupChecklist } from "@/components/office/SetupChecklist";

export default async function Dashboard() {
  await requireAdmin(); // first line of every Office page
  await connectDb();
  const unread = await Message.countDocuments({ read: false, archived: false });
  const base = adminBase();

  const cards: [string, string, string, string | null][] = [
    ["Content", "Add and edit Museum items", `${base}/content`, null],
    ["Messages", unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "No new messages", `${base}/messages`, null],
    ["Settings", "Your profile and site wording", `${base}/settings`, null],
    ["AI Twin", "Talk to your assistant", "", "P07"],
    ["Developer", "Watch Atlas, Cloudinary and more", "", "P08"],
    ["Vault", "Your encrypted .env files", "", "P09"],
  ];
  return (
    <section>
      <h1 className="text-2xl font-semibold">Welcome to the Office</h1>
      <p className="mb-6 mt-2 text-muted">Security is live. The rest is being built phase by phase.</p>
      <SampleBanner />
      <SetupChecklist compact />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([t, d, href, phase]) => (
          <li key={t} className="rounded-2xl border border-line bg-surface p-4">
            {href ? <Link href={href} className="font-medium hover:text-accent">{t}</Link> : <p className="font-medium">{t}</p>}
            <p className="text-sm text-muted">{d}</p>
            {phase && <p className="mt-2 font-mono text-xs text-muted">coming in {phase}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
