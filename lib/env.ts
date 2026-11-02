import "server-only";
import { z } from "zod";

/**
 * ONE place that reads server environment variables.
 * Everything is optional here so the app can boot on a fresh machine;
 * features that need a value call requireEnv("NAME") and get a clear message.
 * Full list of variables: docs/book/ENV.md
 */
const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;
const optional = z.preprocess(blankToUndefined, z.string().optional());

const schema = z.object({
  APP_URL: optional,
  ALLOWED_ORIGINS: optional,
  MONGODB_URI: optional,
  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
  SESSION_SECRET: optional,
  ADMIN_ROUTE_SLUG: optional,
  ADMIN_BOOTSTRAP_HASH: optional,
  COOKIE_DOMAIN: optional,
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: optional, // optional override, default is the "latest flash" alias
  GEMINI_API_BASE_URL: optional, // optional: send AI requests through a proxy or test server instead of Google
  SERVICE_CRED_KEY: optional,
});

export type EnvKey = keyof z.infer<typeof schema>;

let cached: z.infer<typeof schema> | undefined;

/** Parsed environment (read once per server process). */
export function getEnv() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

/** True when the variable is set. Safe to expose as a boolean, never expose the value. */
export function hasEnv(key: EnvKey): boolean {
  return Boolean(getEnv()[key]);
}

/**
 * Returns the value or throws a readable error that names the variable.
 * The error never contains any value, only the name.
 */
export function requireEnv(key: EnvKey): string {
  const value = getEnv()[key];
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Add it to your .env file (or your host's Environment settings). See docs/book/ENV.md.`,
    );
  }
  return value;
}

/** Names of all known variables (used by the health check). */
export const ENV_KEYS = Object.keys(schema.shape) as EnvKey[];
