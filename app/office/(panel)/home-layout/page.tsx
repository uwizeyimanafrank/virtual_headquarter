import { HomeLayout } from "@/components/office/HomeLayout";
import { requireAdmin } from "@/lib/auth-guard";

export default async function Page() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="text-2xl font-semibold">Home layout</h1>
      <p className="mt-2 max-w-prose text-muted">Choose which blocks your Home page shows, put them in the order you like, and edit their words. Blocks marked &quot;coming soon&quot; are not built yet, so visitors do not see them until they are.</p>
      <div className="mt-6"><HomeLayout /></div>
    </section>
  );
}
