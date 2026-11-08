// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const safeDownload = vi.fn();
const upload = vi.fn();
vi.mock("@/lib/services/net", () => ({
  safeDownload: (...a: unknown[]) => safeDownload(...a),
  DownloadError: class DownloadError extends Error { constructor(public code: string) { super(code); } },
}));
vi.mock("@/lib/cloudinary", () => ({ ALLOWED_UPLOAD_FORMATS: "jpg,jpeg,png,webp,gif,avif", cloudinaryClient: () => ({ uploader: { upload: (...a: unknown[]) => upload(...a) } }) }));

import { DownloadError } from "@/lib/services/net";
import { ImportError, importImage } from "@/lib/import-image";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const ok = (over: Record<string, unknown> = {}) => ({ status: 200, contentType: "image/jpeg", body: JPEG, finalUrl: "https://images.example/p/photo.jpg", ...over });
const fail = async (p: Promise<unknown>) => (await p.then(() => "ok", (e) => (e instanceof ImportError ? e.message : `other:${e}`)));

beforeEach(() => {
  safeDownload.mockReset();
  upload.mockReset().mockResolvedValue({ secure_url: "https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/x.jpg", public_id: "vhq/slot/x" });
});

describe("importImage", () => {
  it("downloads, checks, and stores OUR copy in Cloudinary", async () => {
    safeDownload.mockResolvedValue(ok());
    const r = await importImage("  https://images.example/p/photo.jpg ");
    expect(r).toEqual({ url: "https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/x.jpg", publicId: "vhq/slot/x", sourceUrl: "https://images.example/p/photo.jpg", host: "images.example" });
    expect(safeDownload.mock.calls[0][0]).toBe("https://images.example/p/photo.jpg"); // trimmed
    const [data, o] = upload.mock.calls[0];
    expect(String(data)).toMatch(/^data:image\/jpeg;base64,/);
    expect(o).toMatchObject({ folder: "vhq/slot", resource_type: "image" });
  });
  it("reports the final address after redirects as the source", async () => {
    safeDownload.mockResolvedValue(ok({ finalUrl: "https://cdn.images.example/final.jpg" }));
    expect(await importImage("https://short.example/abc")).toMatchObject({ sourceUrl: "https://cdn.images.example/final.jpg", host: "cdn.images.example" });
  });
  it("explains each download problem in plain words", async () => {
    for (const [code, word] of [["BAD_URL", "https://"], ["PRIVATE_ADDRESS", "private"], ["TOO_BIG", "8 MB"], ["TIMEOUT", "too long"], ["TOO_MANY_REDIRECTS", "jumps"], ["NETWORK", "Could not reach"]] as const) {
      safeDownload.mockRejectedValueOnce(new DownloadError(code as never));
      expect(await fail(importImage("https://images.example/a.jpg")), code).toContain(word);
    }
    expect(upload).not.toHaveBeenCalled();
  });
  it("refuses error pages, web pages and files that only claim to be pictures", async () => {
    safeDownload.mockResolvedValueOnce(ok({ status: 404 }));
    expect(await fail(importImage("https://images.example/a.jpg"))).toContain("404");
    safeDownload.mockResolvedValueOnce(ok({ contentType: "text/html" }));
    expect(await fail(importImage("https://images.example/page"))).toContain("not a picture");
    safeDownload.mockResolvedValueOnce(ok({ body: Buffer.from("<html>pretending</html>") })); // says image/jpeg, is a web page
    expect(await fail(importImage("https://images.example/fake.jpg"))).toContain("not a JPG");
    safeDownload.mockResolvedValueOnce(ok({ contentType: "image/svg+xml", body: Buffer.from("<svg></svg>") }));
    expect(await fail(importImage("https://images.example/a.svg"))).toContain("not a JPG");
    expect(upload).not.toHaveBeenCalled();
  });
  it("handles Cloudinary refusing or answering oddly", async () => {
    safeDownload.mockResolvedValue(ok());
    upload.mockRejectedValueOnce(new Error("boom"));
    expect(await fail(importImage("https://images.example/a.jpg"))).toContain("Cloudinary refused");
    upload.mockResolvedValueOnce({ secure_url: "https://evil.example/x.jpg", public_id: "x" });
    expect(await fail(importImage("https://images.example/a.jpg"))).toContain("unexpected");
  });
});
