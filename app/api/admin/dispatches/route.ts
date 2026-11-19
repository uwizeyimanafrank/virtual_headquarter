import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { toAdminDispatch } from "@/lib/admin-dispatches";
import { ensureDispatchSamples } from "@/lib/dispatches-seed";
import { invalidateHome } from "@/lib/home";
import { dispatchInput } from "@/lib/validation";
import { Dispatch } from "@/models/Dispatch";

/** All dispatches (drafts, scheduled, expired and samples too): pinned first, then newest. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  await ensureDispatchSamples();
  const docs = await Dispatch.find({}).sort({ pinned: -1, date: -1 }).limit(500).lean();
  return Response.json({ items: docs.map(toAdminDispatch) }, { headers: { "Cache-Control": "no-store" } });
}

/** Create a dispatch. Starts as a draft unless you say "published". */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = dispatchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please check the fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  await connectDb();
  const created = await Dispatch.create({ ...parsed.data, isSample: false });
  invalidateHome();
  return Response.json({ item: toAdminDispatch(created.toObject()) }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
