import type { ServiceType } from "@/models/Service";

export type Metric = { key: string; label: string; value: number | null; unit: "bytes" | "count" | "ms" | "percent"; limit?: number };
export type Status = "up" | "degraded" | "down" | "unknown";
export type CheckResult = { status: Status; message: string; metrics: Metric[] };

/** What an adapter gets to work with. Credentials are already decrypted and only live for the duration of the check. */
export type ServiceInput = {
  id: string; type: ServiceType; baseUrl: string; healthPath: string;
  credentials: Record<string, string> | null; limitBytes: number | null;
};

/** One adapter per kind of service. Adding a new kind = one new file + one line in lib/services/index.ts. */
export interface Adapter {
  check(service: ServiceInput): Promise<CheckResult>;
}

export const M0_STORAGE_LIMIT_BYTES = 512 * 1024 * 1024; // MongoDB Atlas free tier
