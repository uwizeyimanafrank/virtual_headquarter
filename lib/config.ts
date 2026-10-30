/**
 * Browser-safe config.
 * API_BASE is empty by default, which means "same server" (relative /api paths).
 * Only set NEXT_PUBLIC_API_BASE_URL when the API lives on a different server.
 * NOTE: NEXT_PUBLIC_ values are baked in at build time, so changing it needs a rebuild.
 */
export const API_BASE: string = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
