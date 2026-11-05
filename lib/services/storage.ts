import type { ServiceView } from "@/lib/services/view";

export type StorageRow = { id: string; name: string; type: string; used: number | null; limit: number | null; percent: number | null };
export type StorageSummary = { rows: StorageRow[]; totalUsed: number; totalLimit: number | null; withData: number };

/**
 * Adds up the "storage" numbers every service reports. Services that did not report any are listed with
 * "unknown" and do not count towards the total. The total is exactly the sum of the rows.
 */
export function summarizeStorage(services: ServiceView[]): StorageSummary {
  const rows: StorageRow[] = services.filter((s) => s.enabled).map((s) => {
    const m = s.lastCheck.metrics.find((x) => x.key === "storage" && x.unit === "bytes");
    const used = typeof m?.value === "number" ? m.value : null;
    const limit = typeof m?.limit === "number" ? m.limit : null;
    return { id: s.id, name: s.name, type: s.type, used, limit, percent: used !== null && limit ? Math.min(100, (used / limit) * 100) : null };
  });
  const known = rows.filter((r) => r.used !== null);
  const limits = known.map((r) => r.limit).filter((l): l is number => l !== null);
  return {
    rows,
    totalUsed: known.reduce((sum, r) => sum + (r.used ?? 0), 0),
    totalLimit: limits.length > 0 && limits.length === known.length ? limits.reduce((a, b) => a + b, 0) : null,
    withData: known.length,
  };
}
