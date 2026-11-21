// Plain constants for hire requests, safe to import anywhere (browser, server, validation, model).
export const HIRE_KINDS = ["full-time", "contract", "project"] as const;
export type HireKind = (typeof HIRE_KINDS)[number];
export const HIRE_KIND_LABELS: Record<HireKind, string> = { "full-time": "A full-time role", contract: "A contract (a few months)", project: "A one-off project" };
export const HIRE_STATUSES = ["new", "talking", "won", "lost"] as const;
export type HireStatus = (typeof HIRE_STATUSES)[number];
