// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildTwinContext } from "@/lib/twin-context-core";

const NOW = new Date("2026-10-31T12:00:00Z");

describe("buildTwinContext (what the AI is allowed to know)", () => {
  it("keeps numbers and statuses", () => {
    const c = buildTwinContext({
      items: { samples: 3, byType: { project: { published: 2, draft: 1 }, certificate: { published: 4, draft: 0 } } },
      messages: { unread: 5 },
      database: { dataBytes: 1000, storageBytes: 2000 },
      media: { configured: true, storageBytes: 5000 },
      lastLoginAt: "2026-10-30T08:00:00Z",
    }, NOW);
    expect(c.items.total).toBe(7);
    expect(c.items.samples).toBe(3);
    expect(c.items.byType.project).toEqual({ published: 2, draft: 1 });
    expect(c.items.byType.story).toEqual({ published: 0, draft: 0 }); // known types default to zero
    expect(c.messages.unread).toBe(5);
    expect(c.media).toEqual({ configured: true, storageBytes: 5000 });
    expect(c.lastLoginAt).toBe("2026-10-30T08:00:00.000Z");
    expect(c.generatedAt).toBe(NOW.toISOString());
  });

  it("drops EVERYTHING that is not on the allowed list, even if the collecting code is changed by mistake", () => {
    const hostile = {
      items: { samples: 1, byType: { project: { published: 1, draft: 0, titles: ["My secret project"] }, "evil-type": { published: 99 } }, titles: ["x"] },
      messages: { unread: 2, bodies: ["Hi, my password is hunter2"], emails: ["visitor@example.com"] },
      database: { dataBytes: 10, uri: "mongodb+srv://user:pass@cluster.example/db", storageBytes: 20 },
      media: { configured: true, storageBytes: 30, apiSecret: "cloud-secret-123" },
      lastLoginAt: "not a date",
      env: { MONGODB_URI: "mongodb://x", GEMINI_API_KEY: "AIza-secret", SESSION_SECRET: "s" },
      vault: [{ label: "prod env", cipher: "abc" }],
      password: "hunter2",
      email: "owner@example.com",
    };
    const text = JSON.stringify(buildTwinContext(hostile, NOW));
    for (const bad of ["secret", "hunter2", "mongodb", "AIza", "@", "visitor", "password", "titles", "evil-type", "cipher", "vault", "uri", "email", "env", "apiSecret", "emails", "bodies"]) {
      expect(text.toLowerCase()).not.toContain(bad.toLowerCase());
    }
    expect(buildTwinContext(hostile, NOW).lastLoginAt).toBeNull(); // junk dates become "unknown"
    expect(Object.keys(buildTwinContext(hostile, NOW)).sort()).toEqual(["database", "generatedAt", "items", "lastLoginAt", "media", "messages"]);
  });

  it("turns bad numbers into safe ones", () => {
    const c = buildTwinContext({ items: { samples: -4, byType: { project: { published: Infinity, draft: "7" } } }, messages: { unread: NaN }, database: { dataBytes: -1 }, media: { storageBytes: "big" } }, NOW);
    expect(c.items.samples).toBe(0);
    expect(c.items.byType.project).toEqual({ published: 0, draft: 0 });
    expect(c.messages.unread).toBe(0);
    expect(c.database.dataBytes).toBeNull();
    expect(c.media.storageBytes).toBeNull();
    expect(c.media.configured).toBe(false);
  });

  it("copes with nothing at all", () => {
    for (const raw of [null, undefined, 5, "text", []]) expect(() => buildTwinContext(raw, NOW)).not.toThrow();
    expect(buildTwinContext(undefined, NOW).items.total).toBe(0);
  });

  it("only ever contains plain printable characters", () => {
    expect(JSON.stringify(buildTwinContext({ items: { samples: 1 } }, NOW))).toMatch(/^[\x20-\x7e]*$/);
  });
});
