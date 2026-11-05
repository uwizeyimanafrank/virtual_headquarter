import "server-only";
import { decryptSecret } from "@/lib/crypto-server";
import { cloudinaryAdapter } from "@/lib/services/cloudinary";
import { httpAdapter } from "@/lib/services/http";
import { mongodbAdapter } from "@/lib/services/mongodb";
import { renderAdapter } from "@/lib/services/render";
import type { Adapter, CheckResult, ServiceInput } from "@/lib/services/types";
import type { ServiceType } from "@/models/Service";

/** The registry: service type -> adapter. A new kind of service = a new file in lib/services plus one line here. */
export const ADAPTERS: Record<ServiceType, Adapter> = { http: httpAdapter, mongodb: mongodbAdapter, cloudinary: cloudinaryAdapter, render: renderAdapter };

export const credentialLabel = (id: string) => `service:${id}`; // bound into the encryption so a value cannot be moved to another service

export function decryptCredentials(id: string, enc: string): Record<string, string> | null {
  if (!enc) return null;
  try { return JSON.parse(decryptSecret(enc, credentialLabel(id))) as Record<string, string>; } catch { return null; }
}

const CHECK_TIMEOUT_MS = 9000;

/** Runs one check. Never throws: any failure becomes a plain "down" or "unknown" result with no technical detail. */
export async function runCheck(service: ServiceInput): Promise<CheckResult> {
  try {
    return await Promise.race([
      ADAPTERS[service.type].check(service),
      new Promise<CheckResult>((resolve) => setTimeout(() => resolve({ status: "down", message: "The check took too long.", metrics: [] }), CHECK_TIMEOUT_MS)),
    ]);
  } catch {
    return { status: "unknown", message: "The check could not run.", metrics: [] };
  }
}
