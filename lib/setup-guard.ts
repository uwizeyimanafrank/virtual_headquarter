import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The local Setup screen (/setup) lets you paste your database and media links instead of editing .env by hand.
 * It exists ONLY on your own computer: in development mode, or when you set ENABLE_SETUP_WIZARD=true yourself.
 * On a real host (production) it does not exist at all (404), whatever anybody sends.
 * Even locally it needs a one-time code that is printed in YOUR terminal, so another device on the same Wi-Fi cannot use it.
 */
export function setupEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_SETUP_WIZARD === "true";
}

export function isLoopbackHost(host: string | null | undefined): boolean {
  const h = (host ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

type G = typeof globalThis & { __vhqSetupCode?: string };

/** One code per server start, kept in memory only. Printed to the terminal the first time it is needed. */
export function setupCode(print = false): string {
  const g = globalThis as G;
  if (!g.__vhqSetupCode) g.__vhqSetupCode = randomBytes(4).toString("hex");
  if (print) console.log(`\n  VHQ setup code: ${g.__vhqSetupCode}  (type it on the /setup page)\n`);
  return g.__vhqSetupCode;
}

export function codeMatches(given: unknown): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given.trim().toLowerCase());
  const b = Buffer.from(setupCode());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when this request may use the setup screen. */
export function setupAllowedFor(host: string | null | undefined): boolean {
  return setupEnabled() && isLoopbackHost(host);
}
