import { requireAdmin } from "@/lib/auth-guard";

export default async function AiPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="text-2xl font-semibold">AI Twin</h1>
      <p className="mt-2 max-w-prose text-muted">Your assistant lives in the round button at the bottom right of every Office page. Click it to chat. It can see numbers about your site (how many items, unread messages, storage) and help you write titles, descriptions and stories. It can never see your passwords, keys, vault or visitors&apos; messages.</p>
      <p className="mt-4 text-sm text-muted">Not answering? Open Setup, then Config Doctor, and check that the Gemini key is set.</p>
    </section>
  );
}
