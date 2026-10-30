import { adminApi } from "@/lib/auth-guard";
import { runChecks } from "@/lib/doctor";

/** Setup checks in plain words. Booleans and sentences only, never values. */
export async function GET(request: Request) {
  const auth = await adminApi(request);
  if (!auth.ok) return auth.response;
  return Response.json({ checks: await runChecks() }, { headers: { "Cache-Control": "no-store" } });
}
