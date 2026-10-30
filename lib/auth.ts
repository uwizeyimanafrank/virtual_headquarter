import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { notFound } from "next/navigation";
import { getEnv } from "@/lib/env";

// OWASP minimum for argon2id: 19 MiB memory, 2 passes, 1 lane.
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON);
}

/** A real hash of a random value. Used so a wrong email takes as long as a wrong password. */
let dummy: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  return (dummy ??= hash(`dummy-${Math.random()}-${Date.now()}`, ARGON));
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  const target = storedHash || (await dummyHash());
  try {
    const ok = await verify(target, password);
    return ok && Boolean(storedHash);
  } catch {
    return false;
  }
}

const RESERVED = new Set(["office", "api", "admin", "login", "museum", "connect", "_next"]);

/** The secret first path segment of the Office. Returns null when it is missing or unsafe (Office disabled). */
export function getAdminSlug(): string | null {
  const slug = getEnv().ADMIN_ROUTE_SLUG;
  if (!slug || !/^[a-z0-9-]{8,64}$/.test(slug) || RESERVED.has(slug)) return null;
  return slug;
}

/** "/<slug>" for building links to the Office. 404s when the Office is not configured. */
export function adminBase(): string {
  const slug = getAdminSlug();
  if (!slug) notFound();
  return `/${slug}`;
}

/** Secure cookies for https hosts. Plain http only when APP_URL says http (local testing). */
export function cookiesSecure(): boolean {
  const appUrl = getEnv().APP_URL ?? "";
  if (appUrl.startsWith("https://")) return true;
  if (appUrl.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}

/**
 * ADMIN_BOOTSTRAP_HASH is stored as "b64:<base64 of the argon2 hash>".
 * Why: .env loaders treat "$" as a variable marker and silently damage raw argon2 hashes.
 * A raw "$argon2..." value is still accepted (for hosts that store env values untouched).
 */
export function getBootstrapHash(): string | undefined {
  const v = getEnv().ADMIN_BOOTSTRAP_HASH;
  if (!v) return undefined;
  if (v.startsWith("b64:")) return Buffer.from(v.slice(4), "base64").toString("utf8");
  return v;
}
