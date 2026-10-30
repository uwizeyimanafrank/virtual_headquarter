"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Health = { ok: boolean; dbReachable: boolean; cloudinaryReachable: boolean };

/** TEMPORARY diagnostic for phase P00. Remove it when the real Home page is built (P04). */
export function HealthBadge() {
  const [state, setState] = useState<"loading" | "error" | Health>("loading");

  useEffect(() => {
    api<Health>("/api/health")
      .then(setState)
      .catch(() => setState("error"));
  }, []);

  const label =
    state === "loading"
      ? "checking..."
      : state === "error"
        ? "health check failed"
        : `server ok | database: ${state.dbReachable ? "yes" : "no"} | media: ${state.cloudinaryReachable ? "yes" : "no"}`;

  return (
    <p className="rounded-full border border-line bg-surface px-4 py-2 font-mono text-xs text-muted backdrop-blur">
      {label}
    </p>
  );
}
