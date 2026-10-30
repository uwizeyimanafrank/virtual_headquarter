import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { toAdminItem } from "@/lib/admin-items";
import { invalidateHome } from "@/lib/home";
import { museumItemInput } from "@/lib/validation";
import { ITEM_TYPES, MuseumItem, type ItemType } from "@/models/MuseumItem";

const TYPE_ORDER: Record<ItemType, number> = { story: 0, certificate: 1, project: 2, book: 3, reference: 4 };

/** All items (drafts and samples too), in the same order the public Museum uses. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const type = ITEM_TYPES.find((t) => t === params.get("type"));
  const status = params.get("status");
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 100);

  await connectDb();
  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (status === "draft" || status === "published") filter.status = status;
  const docs = await MuseumItem.find(filter).limit(500).lean();
  const items = docs
    .filter((d) => !q || d.title.toLowerCase().includes(q))
    .sort((a, b) => TYPE_ORDER[a.type as ItemType] - TYPE_ORDER[b.type as ItemType] || (a.order ?? 0) - (b.order ?? 0) || b.date.localeCompare(a.date))
    .map(toAdminItem);
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

/** Create an item. Starts as a draft unless you say "published". */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = museumItemInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  await connectDb();
  const created = await MuseumItem.create({ ...parsed.data, isSample: false });
  invalidateHome();
  return Response.json({ item: toAdminItem(created.toObject()) }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
