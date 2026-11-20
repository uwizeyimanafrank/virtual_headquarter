import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GalleryManager } from "@/components/office/GalleryManager";
import { GalleryUpload } from "@/components/office/GalleryUpload";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/upload-image";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("@/lib/upload-image", async (orig) => ({ ...(await orig<typeof import("@/lib/upload-image")>()), uploadImage: vi.fn() }));
const mockApi = vi.mocked(api);
const mockUpload = vi.mocked(uploadImage);

const id = (n: number) => String(n).padStart(24, "a");
const img = (n: number, over = {}) => ({ id: id(n), imageUrl: `https://res.cloudinary.com/demo/image/upload/v1/vhq/gallery/${n}.jpg`, caption: "", alt: `Picture ${n}`, album: "", takenDate: "", order: n, published: false, ...over });

describe("GalleryUpload: 10 pictures in one go", () => {
  beforeEach(() => { mockApi.mockReset().mockResolvedValue({}); mockUpload.mockReset(); });

  it("uploads all 10 (3 at a time), needs alt text on each, then saves them in ONE request in order", async () => {
    let running = 0, peak = 0;
    mockUpload.mockImplementation(async (file) => {
      running++; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return `https://res.cloudinary.com/demo/image/upload/v1/vhq/gallery/${file.name}`;
    });
    const onSaved = vi.fn();
    const { container } = render(<GalleryUpload albumId={id(9)} onSaved={onSaved} />);
    const files = Array.from({ length: 10 }, (_, n) => new File(["x"], `p${n}.jpg`, { type: "image/jpeg" }));
    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files } });

    await waitFor(() => expect(screen.getAllByLabelText(/^Alt text for/)).toHaveLength(10));
    expect(mockUpload).toHaveBeenCalledTimes(10);
    expect(peak).toBe(3);

    const save = () => screen.getByRole("button", { name: /^Save 10 pictures$/ }) as HTMLButtonElement;
    expect(save().disabled).toBe(true); // no alt text yet
    screen.getAllByLabelText(/^Alt text for/).forEach((el, n) => fireEvent.change(el, { target: { value: `Alt ${n}` } }));
    expect(save().disabled).toBe(false);
    fireEvent.click(screen.getByLabelText("Publish right away"));
    fireEvent.click(save());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [path, init] = mockApi.mock.calls.at(-1)!;
    expect(path).toBe("/api/admin/gallery");
    const body = JSON.parse(String((init as RequestInit).body)) as { images: { imageUrl: string; alt: string; album: string; published: boolean }[] };
    expect(body.images).toHaveLength(10);
    expect(body.images.map((i) => i.alt)).toEqual(Array.from({ length: 10 }, (_, n) => `Alt ${n}`));
    expect(body.images.map((i) => i.imageUrl.split("/").pop())).toEqual(Array.from({ length: 10 }, (_, n) => `p${n}.jpg`)); // order of choosing is kept
    expect(body.images.every((i) => i.album === id(9) && i.published)).toBe(true);
  });

  it("shows a failed file and still saves the others", async () => {
    mockUpload.mockImplementation(async (file) => { if (file.name === "bad.gif") throw new Error("Gallery pictures must be JPG, PNG or WebP"); return `https://res.cloudinary.com/demo/image/upload/v1/${file.name}`; });
    const { container } = render(<GalleryUpload albumId="" onSaved={() => {}} />);
    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files: [new File(["x"], "ok.jpg", { type: "image/jpeg" }), new File(["x"], "bad.gif", { type: "image/gif" })] } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/JPG, PNG or WebP/);
    expect(screen.getAllByLabelText(/^Alt text for/)).toHaveLength(1);
  });

  it("takes at most 20 pictures at a time", async () => {
    mockUpload.mockResolvedValue("https://res.cloudinary.com/demo/image/upload/v1/x.jpg");
    const { container } = render(<GalleryUpload albumId="" onSaved={() => {}} />);
    const files = Array.from({ length: 23 }, (_, n) => new File(["x"], `p${n}.jpg`, { type: "image/jpeg" }));
    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, { target: { files } });
    await waitFor(() => expect(screen.getAllByLabelText(/^Alt text for/)).toHaveLength(20));
    expect(screen.getByText(/Up to 20 pictures at a time/)).toBeTruthy();
  });
});

describe("GalleryManager: reorder", () => {
  const images = [img(1), img(2), img(3), img(4, { album: id(9) })];
  const albums = [{ id: id(9), title: "Kigali", description: "", order: 0 }];
  beforeEach(() => {
    mockApi.mockReset().mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/gallery" && !init?.method) return { images, albums };
      return { ok: true };
    });
  });
  const altOrder = () => screen.getAllByLabelText("Alt text").map((e) => (e as HTMLInputElement).value);
  const lastPut = () => { const c = mockApi.mock.calls.filter(([p]) => p === "/api/admin/gallery/order").at(-1)!; return JSON.parse(String((c[1] as RequestInit).body)).ids as string[]; };

  it("moves a picture with the arrow buttons and saves the new order", async () => {
    render(<GalleryManager />);
    await screen.findAllByLabelText("Alt text");
    expect(altOrder()).toEqual(["Picture 1", "Picture 2", "Picture 3", "Picture 4"]);
    fireEvent.click(within(screen.getAllByRole("listitem")[0]).getByLabelText("Move later"));
    expect(altOrder()).toEqual(["Picture 2", "Picture 1", "Picture 3", "Picture 4"]);
    await waitFor(() => expect(lastPut()).toEqual([id(2), id(1), id(3), id(4)]));
  });

  it("drags the handle of the last picture onto the first and saves", async () => {
    render(<GalleryManager />);
    await screen.findAllByLabelText("Alt text");
    const items = screen.getAllByRole("listitem");
    const dataTransfer = { setData() {}, setDragImage() {}, effectAllowed: "" };
    fireEvent.dragStart(within(items[3]).getByLabelText(/Drag to reorder/), { dataTransfer });
    fireEvent.dragOver(items[0], { dataTransfer });
    fireEvent.drop(items[0], { dataTransfer });
    expect(altOrder()).toEqual(["Picture 4", "Picture 1", "Picture 2", "Picture 3"]);
    await waitFor(() => expect(lastPut()).toEqual([id(4), id(1), id(2), id(3)]));
  });

  it("reorders only the pictures of the chosen album", async () => {
    render(<GalleryManager />);
    await screen.findAllByLabelText("Alt text");
    fireEvent.click(screen.getByRole("button", { name: /^Kigali/ }));
    expect(altOrder()).toEqual(["Picture 4"]);
    expect(within(screen.getByRole("listitem")).getByLabelText("Move earlier")).toHaveProperty("disabled", true);
  });
});
