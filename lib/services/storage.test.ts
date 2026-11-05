import { describe, expect, it } from "vitest";
import { summarizeStorage } from "@/lib/services/storage";
import { formatBytes } from "@/lib/format";
import { toServiceView } from "@/lib/services/view";
import type { ServiceView } from "@/lib/services/view";

const svc = (id: string, over: Partial<ServiceView> & { storage?: { value: number; limit?: number } } = {}): ServiceView => ({
  id, name: `S${id}`, type: "mongodb", baseUrl: "", healthPath: "/", enabled: true, limitBytes: null, hasCredentials: false,
  lastCheck: { at: null, status: "up", message: "", metrics: over.storage ? [{ key: "storage", label: "Storage", value: over.storage.value, unit: "bytes", ...(over.storage.limit ? { limit: over.storage.limit } : {}) }] : [] },
  ...over,
});

describe("summarizeStorage", () => {
  it("the total is exactly the sum of the rows", () => {
    const s = summarizeStorage([svc("1", { storage: { value: 100 } }), svc("2", { storage: { value: 250 } }), svc("3", { storage: { value: 7 } })]);
    expect(s.totalUsed).toBe(357);
    expect(s.rows.map((r) => r.used)).toEqual([100, 250, 7]);
    expect(s.withData).toBe(3);
  });
  it("services without storage data are listed but do not count", () => {
    const s = summarizeStorage([svc("1", { storage: { value: 100 } }), svc("2")]);
    expect(s.totalUsed).toBe(100);
    expect(s.rows[1].used).toBeNull();
    expect(s.withData).toBe(1);
  });
  it("shows percentages against limits, capped at 100", () => {
    const s = summarizeStorage([svc("1", { storage: { value: 50, limit: 200 } }), svc("2", { storage: { value: 500, limit: 200 } })]);
    expect(s.rows[0].percent).toBe(25);
    expect(s.rows[1].percent).toBe(100);
    expect(s.totalLimit).toBe(400);
  });
  it("gives no total limit when some services have none (an incomplete total would mislead)", () => {
    expect(summarizeStorage([svc("1", { storage: { value: 5, limit: 10 } }), svc("2", { storage: { value: 5 } })]).totalLimit).toBeNull();
  });
  it("paused services are left out", () => {
    expect(summarizeStorage([svc("1", { storage: { value: 100 }, enabled: false })]).rows).toHaveLength(0);
  });
  it("handles an empty list", () => {
    expect(summarizeStorage([])).toEqual({ rows: [], totalUsed: 0, totalLimit: null, withData: 0 });
  });
});

describe("formatBytes", () => {
  it("writes sizes in plain words", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(512 * 1024 * 1024)).toBe("512 MB");
    expect(formatBytes(3.5 * 1024 ** 3)).toBe("3.5 GB");
  });
  it("copes with missing or silly values", () => {
    for (const v of [null, undefined, -1, NaN, Infinity]) expect(formatBytes(v as number)).toBe("unknown");
  });
});

describe("toServiceView", () => {
  it("never exposes stored credentials, only whether some exist", () => {
    const v = toServiceView({ _id: "1", name: "n", type: "render", credentialEnc: "v1.aaa.bbb.ccc", lastCheck: { status: "up", message: "ok", metrics: [] } } as never);
    expect(JSON.stringify(v)).not.toContain("v1.aaa");
    expect(v.hasCredentials).toBe(true);
    expect(toServiceView({ _id: "2", name: "n", type: "http", credentialEnc: "" } as never).hasCredentials).toBe(false);
  });
  it("turns unknown statuses into 'unknown'", () => {
    expect(toServiceView({ _id: "1", name: "n", type: "http", lastCheck: { status: "weird" } } as never).lastCheck.status).toBe("unknown");
  });
});
