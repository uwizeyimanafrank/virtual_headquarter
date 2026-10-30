import { requireAdmin } from "@/lib/auth-guard";
import { ItemForm } from "@/components/office/ItemForm";

export default async function NewItemPage() {
  await requireAdmin(); // first line of every Office page
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Add item</h1>
      <ItemForm />
    </section>
  );
}
