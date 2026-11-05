import type { Metric, Status } from "@/lib/services/types";

/** A service as the browser sees it. Note: no credentials, only whether some are stored. */
export type ServiceView = {
  id: string; name: string; type: string; baseUrl: string; healthPath: string; enabled: boolean;
  limitBytes: number | null; hasCredentials: boolean;
  lastCheck: { at: string | null; status: Status; message: string; metrics: Metric[] };
};

export function toServiceView(d: {
  _id: unknown; name: string; type: string; baseUrl?: string | null; healthPath?: string | null; enabled?: boolean | null;
  limitBytes?: number | null; credentialEnc?: string | null;
  lastCheck?: { at?: Date | null; status?: string | null; message?: string | null; metrics?: unknown[] | null } | null;
}): ServiceView {
  const c = d.lastCheck;
  return {
    id: String(d._id), name: d.name, type: d.type, baseUrl: d.baseUrl ?? "", healthPath: d.healthPath ?? "/",
    enabled: d.enabled !== false, limitBytes: d.limitBytes ?? null, hasCredentials: Boolean(d.credentialEnc),
    lastCheck: {
      at: c?.at ? new Date(c.at).toISOString() : null,
      status: (["up", "degraded", "down", "unknown"].includes(c?.status ?? "") ? c!.status : "unknown") as Status,
      message: c?.message ?? "",
      metrics: Array.isArray(c?.metrics) ? (c!.metrics as Metric[]) : [],
    },
  };
}
