import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryClient } from "@/lib/cloudinary";
import type { Adapter, CheckResult, Metric } from "@/lib/services/types";

type Usage = { storage?: { usage?: number }; bandwidth?: { usage?: number }; credits?: { used_percent?: number; usage?: number; limit?: number } };

/** Cloudinary usage. With no stored credentials it uses the CLOUDINARY_* values from the environment. */
export const cloudinaryAdapter: Adapter = {
  async check(s): Promise<CheckResult> {
    try {
      const c = s.credentials;
      const usage = (await (c ? cloudinary.api.usage({ cloud_name: c.cloudName, api_key: c.apiKey, api_secret: c.apiSecret }) : cloudinaryClient().api.usage())) as Usage;
      const metrics: Metric[] = [];
      if (typeof usage.storage?.usage === "number") metrics.push({ key: "storage", label: "Storage used", value: usage.storage.usage, unit: "bytes", ...(s.limitBytes ? { limit: s.limitBytes } : {}) });
      if (typeof usage.bandwidth?.usage === "number") metrics.push({ key: "bandwidth", label: "Bandwidth this month", value: usage.bandwidth.usage, unit: "bytes" });
      const pct = usage.credits?.used_percent;
      if (typeof pct === "number") metrics.push({ key: "credits", label: "Free credits used", value: pct, unit: "percent", limit: 100 });
      return pct !== undefined && pct >= 90 ? { status: "degraded", message: "Over 90% of free credits used.", metrics } : { status: "up", message: "Connected.", metrics };
    } catch {
      return { status: "down", message: "Could not read Cloudinary usage. Check the values.", metrics: [] };
    }
  },
};
