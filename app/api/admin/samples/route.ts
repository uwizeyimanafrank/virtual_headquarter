import { z } from "zod";
import { connectDb } from "@/lib/db";
import { adminApi, requireFreshAuth } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { invalidateHome } from "@/lib/home";
import { invalidateMuseum } from "@/lib/museum";
import { getSettings } from "@/lib/settings";
import { deleteSamples, ensureSamples, sampleStatus } from "@/lib/samples";
import { Settings } from "@/models/Settings";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("show") }),
  z.object({ action: z.literal("hide") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("delete") }),
  z.object({ action: z.literal("autohide"), value: z.boolean() }),
]);

/**
 * Sample status for the dashboard banner. The very first call also fills the site with sample content
 * (once, only if there is no real content) and refreshes the Home page so it shows right away.
 */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  await connectDb();
  if (await ensureSamples()) {
    invalidateHome();
    invalidateMuseum();
  }
  return Response.json(await sampleStatus(), { headers: { "Cache-Control": "no-store" } });
}

/** Sample content controls: show/hide publicly, auto-hide per type, restore, or delete all (needs fresh 2FA). */
export async function POST(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const b = parsed.data;

  await connectDb();
  await getSettings();
  switch (b.action) {
    case "show":
    case "hide":
      await Settings.updateOne({ key: "main" }, { $set: { showSamples: b.action === "show" } });
      await audit("settings_change", true, request.headers, `samples ${b.action}`);
      break;
    case "autohide":
      await Settings.updateOne({ key: "main" }, { $set: { autoHideSamples: b.value } });
      await audit("settings_change", true, request.headers, `samples autohide ${b.value}`);
      break;
    case "restore":
      await ensureSamples(true);
      await audit("settings_change", true, request.headers, "samples restored");
      break;
    case "delete": {
      const stale = requireFreshAuth(auth.session, 300);
      if (stale) return stale;
      const n = await deleteSamples();
      await audit("delete", true, request.headers, `${n} sample items`);
      break;
    }
  }
  invalidateHome();
  invalidateMuseum();
  return Response.json(await sampleStatus(), { headers: { "Cache-Control": "no-store" } });
}
