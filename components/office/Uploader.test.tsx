import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Uploader } from "@/components/office/Uploader";
import { api } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);

const enc = (s: string) => Uint8Array.from(Array.from(s, (c) => c.charCodeAt(0)));
const cat = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let a = 0; for (const x of p) { o.set(x, a); a += x.length; } return o; };
const seg = (m: number, payload: Uint8Array) => cat(Uint8Array.of(0xff, m, (payload.length + 2) >> 8, (payload.length + 2) & 255), payload);
/** A tiny JPEG that carries a GPS place in EXIF-like and XMP blocks. */
const photo = cat(Uint8Array.of(0xff, 0xd8), seg(0xe1, enc("Exif\0\0GPS-LAT-1.95-LON-30.06")), seg(0xe1, enc("<xmp>GPSLatitude</xmp>")), seg(0xdb, Uint8Array.of(0, 1)), seg(0xda, Uint8Array.of(1, 1, 0, 0, 0x3f, 0)), enc("PIXELS"), Uint8Array.of(0xff, 0xd9));

let sent: FormData | null = null;
class FakeXhr {
  status = 200; responseText = JSON.stringify({ secure_url: "https://res.cloudinary.com/demo/image/upload/v1/vhq/gallery/a.jpg" });
  upload: Record<string, unknown> = {}; onload: (() => void) | null = null; onerror: (() => void) | null = null;
  open() {}
  send(form: FormData) { sent = form; queueMicrotask(() => this.onload?.()); }
}

beforeEach(() => {
  sent = null;
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  mockApi.mockReset().mockResolvedValue({ cloudName: "demo", apiKey: "k", timestamp: 1, folder: "vhq/gallery", allowedFormats: "jpg", signature: "s" });
});
afterEach(() => vi.unstubAllGlobals());

const pick = (name: string, bytes: Uint8Array, type: string) => {
  const { container } = render(<Uploader folder="gallery" value="" onChange={onChange} />);
  const file = new File([bytes as BlobPart], name, { type });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.slice().buffer }); // jsdom has no Blob.arrayBuffer
  fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [file] } });
};
const onChange = vi.fn();
beforeEach(() => onChange.mockReset());

describe("Uploader removes hidden location data before upload", () => {
  it("never sends the GPS place: the file that leaves the device is cleaned", async () => {
    pick("me.jpg", photo, "image/jpeg");
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://res.cloudinary.com/demo/image/upload/v1/vhq/gallery/a.jpg"));
    const file = sent?.get("file") as File;
    const body = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsBinaryString(file); });
    expect(body).not.toContain("GPS");
    expect(body).not.toContain("xmp");
    expect(body).toContain("PIXELS");
  });
  it("refuses a GIF in the gallery (its hidden data is not removed), and sends nothing", async () => {
    pick("a.gif", enc("GIF89a\x01\0\x01\0"), "image/gif");
    expect((await screen.findByRole("alert")).textContent).toMatch(/JPG, PNG or WebP/);
    expect(sent).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
  it("refuses a damaged picture with a clear message", async () => {
    pick("bad.jpg", photo.subarray(0, 20), "image/jpeg");
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not be read safely/);
    expect(sent).toBeNull();
  });
});
