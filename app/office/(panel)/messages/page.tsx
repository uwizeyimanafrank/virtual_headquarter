import { requireAdmin } from "@/lib/auth-guard";
import { MessagesInbox } from "@/components/office/MessagesInbox";

export default async function MessagesPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-2 text-2xl font-semibold">Messages</h1>
      <p className="mb-6 text-muted">Messages visitors send from the Connect page.</p>
      <MessagesInbox />
    </section>
  );
}
