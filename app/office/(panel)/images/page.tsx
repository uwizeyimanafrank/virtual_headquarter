import { ImageSlots } from "@/components/office/ImageSlots";
import { requireAdmin } from "@/lib/auth-guard";

export default async function Page() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="text-2xl font-semibold">Images</h1>
      <p className="mt-2 max-w-prose text-muted">Every fixed picture on your public site is listed here with where it shows. Replace any of them, or reset it to the built-in default. Nothing needs a code change.</p>
      <div className="mt-6"><ImageSlots /></div>
    </section>
  );
}
