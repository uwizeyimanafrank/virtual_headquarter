import "server-only";
import { probe } from "@/lib/services/net";
import type { Adapter, CheckResult } from "@/lib/services/types";

/** Pings an address and reports up/down and how fast it answered. */
export const httpAdapter: Adapter = {
  async check(s): Promise<CheckResult> {
    const url = s.baseUrl.replace(/\/+$/, "") + (s.healthPath || "/");
    try {
      const p = await probe(url, { token: s.credentials?.token });
      const metrics = [{ key: "latency", label: "Response time", value: p.ms, unit: "ms" as const }];
      if (p.status >= 200 && p.status < 400) return { status: p.ms > 2000 ? "degraded" : "up", message: p.ms > 2000 ? "Answering, but slowly." : `Answered with ${p.status}.`, metrics };
      return { status: "down", message: `Answered with error ${p.status}.`, metrics };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? (err as Error).message;
      const message = code === "PRIVATE_ADDRESS" ? "That address is on a private network, which is not allowed here." : code === "BAD_URL" ? "That address is not valid." : code === "TIMEOUT" ? "No answer within 5 seconds." : "Could not connect.";
      return { status: "down", message, metrics: [] };
    }
  },
};
