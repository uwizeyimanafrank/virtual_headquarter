import "server-only";
import { createHash } from "node:crypto";
import { getEnv, requireEnv } from "@/lib/env";

/** Best guess of the visitor's IP. Hosts like Render and Vercel set x-forwarded-for. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Salted hash of the IP so we can rate-limit without storing the real address. */
export function ipHash(headers: Headers): string {
  const env = getEnv();
  // In production a real secret is required. Locally we allow a dev-only salt.
  const salt = process.env.NODE_ENV === "production" ? requireEnv("SESSION_SECRET") : (env.SESSION_SECRET ?? "dev-only-salt");
  return createHash("sha256").update(`${salt}|${clientIp(headers)}`).digest("hex").slice(0, 32);
}

/**
 * Browsers send an Origin header on cross-site and POST requests.
 * Allow: no Origin (same-origin GET, tools), our own host, APP_URL, or ALLOWED_ORIGINS.
 */
export function isAllowedOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (!origin) return true;
  const env = getEnv();
  const allowed = new Set<string>();
  (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean).forEach((o) => allowed.add(o));
  if (env.APP_URL) allowed.add(env.APP_URL.replace(/\/+$/, ""));
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host) {
    const proto = headers.get("x-forwarded-proto") ?? (origin.startsWith("https") ? "https" : "http");
    allowed.add(`${proto}://${host}`);
  }
  return allowed.has(origin.replace(/\/+$/, ""));
}
