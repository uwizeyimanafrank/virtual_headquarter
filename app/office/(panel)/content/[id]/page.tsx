import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { toAdminItem } from "@/lib/admin-items";
import { ItemForm } from "@/components/office/ItemForm";
import { MuseumItem } from "@/models/MuseumItem";

export default async function EditItemPage(props: PageProps<"/office/content/[id]">) {
  await requireAdmin(); // first line of every Office page
  const { id } = await props.params;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  await connectDb();
  const doc = await MuseumItem.findById(id).lean();
  if (!doc) notFound();
  return (
    <section>
      <h1 className="mb-6 text-2xl font-semibold">Edit item</h1>
      <ItemForm initial={toAdminItem(doc)} />
    </section>
  );
}
