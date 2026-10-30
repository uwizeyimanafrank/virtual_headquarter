import { connectDb } from "@/lib/db";
import { adminApi } from "@/lib/auth-guard";
import { Message } from "@/models/Message";

/** Visitor messages, newest first. `?archived=1` shows the archive. Text is plain text. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const archived = new URL(request.url).searchParams.get("archived") === "1";
  await connectDb();
  const [docs, unread] = await Promise.all([
    Message.find({ archived }).sort({ createdAt: -1 }).limit(200).lean(),
    Message.countDocuments({ read: false, archived: false }),
  ]);
  return Response.json(
    { unread, messages: docs.map((m) => ({ id: String(m._id), name: m.name, email: m.email, body: m.body, read: m.read, archived: m.archived, createdAt: m.createdAt })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
