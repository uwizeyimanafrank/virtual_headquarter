import "server-only";
import { getEnv } from "@/lib/env";
import type { Adapter, CheckResult } from "@/lib/services/types";

const DEFAULT_BASE = "https://api.render.com";
const TROUBLE = new Set(["build_failed", "update_failed", "pre_deploy_failed", "canceled", "deactivated"]);
const BUSY = new Set(["created", "build_in_progress", "update_in_progress", "pre_deploy_in_progress"]);

async function get(base: string, path: string, key: string): Promise<unknown> {
  const res = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${key}`, accept: "application/json" }, signal: AbortSignal.timeout(6000), redirect: "manual" });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

/** Render service health: is it suspended, and what is the state of the latest deploy. */
export const renderAdapter: Adapter = {
  async check(s): Promise<CheckResult> {
    const key = s.credentials?.apiKey, id = s.credentials?.serviceId;
    if (!key || !id) return { status: "unknown", message: "Add your Render API key and service ID.", metrics: [] };
    const base = (getEnv().RENDER_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "");
    try {
      const svc = (await get(base, `/v1/services/${encodeURIComponent(id)}`, key)) as { suspended?: string };
      if (svc.suspended && svc.suspended !== "not_suspended") return { status: "down", message: "The service is suspended.", metrics: [] };
      const deploys = (await get(base, `/v1/services/${encodeURIComponent(id)}/deploys?limit=1`, key).catch(() => [])) as { deploy?: { status?: string }; status?: string }[];
      const latest = deploys[0]?.deploy?.status ?? deploys[0]?.status;
      if (latest && TROUBLE.has(latest)) return { status: "degraded", message: `Latest deploy: ${latest.replaceAll("_", " ")}.`, metrics: [] };
      if (latest && BUSY.has(latest)) return { status: "degraded", message: "A deploy is in progress.", metrics: [] };
      return { status: "up", message: latest ? `Running (latest deploy: ${latest.replaceAll("_", " ")}).` : "Running.", metrics: [] };
    } catch (err) {
      const m = (err as Error).message;
      return { status: "down", message: m === "HTTP_401" || m === "HTTP_403" ? "Render refused the API key." : m === "HTTP_404" ? "Render does not know that service ID." : "Could not reach the Render API.", metrics: [] };
    }
  },
};
