import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemForm } from "@/components/office/ItemForm";
import type { AdminItem } from "@/lib/admin-items";
import { api } from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/office/content/new" }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);
beforeEach(() => { mockApi.mockReset(); push.mockReset(); mockApi.mockResolvedValue({}); });

const item: AdminItem = { id: "i1", type: "project", title: "Shop", description: "d", mediaUrl: "", parallaxSpeed: 0.5, display: "both", gallery: ["https://res.cloudinary.com/demo/image/upload/g1.jpg"], video: "", date: "2026-01", status: "published", order: 0, isSample: false, metadata: { gradeOrLink: "", skills: [], howIEarnedIt: "", problem: "", whatIDid: "", result: "", featured: false } } as unknown as AdminItem;
const lastBody = () => JSON.parse((mockApi.mock.calls.at(-1)![1] as { body: string }).body);

describe("ItemForm: Museum halls options", () => {
  it("new items default to both halls, no gallery, no video", async () => {
    render(<ItemForm />);
    await userEvent.type(screen.getByLabelText("Title"), "New piece");
    await userEvent.click(screen.getByRole("button", { name: /save|publish|create/i }));
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    expect(lastBody()).toMatchObject({ display: "both", gallery: [], video: "" });
  });
  it("saves the chosen hall, the featured tick and a trimmed video address", async () => {
    render(<ItemForm initial={item} />);
    await userEvent.selectOptions(screen.getByLabelText("Where it appears"), "case");
    await userEvent.click(screen.getByLabelText(/Feature this piece/));
    await userEvent.type(screen.getByLabelText("Video link (optional)"), "  https://res.cloudinary.com/demo/video/upload/v.mp4 ");
    await userEvent.click(screen.getByRole("button", { name: /save|publish|update/i }));
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    const b = lastBody();
    expect(b.display).toBe("case");
    expect(b.video).toBe("https://res.cloudinary.com/demo/video/upload/v.mp4");
    expect(b.metadata.featured).toBe(true);
  });
  it("shows the extra pictures and removing one drops it from the save", async () => {
    render(<ItemForm initial={item} />);
    expect(screen.getByText(/More pictures for the Glass Cases \(1 of 8\)/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove extra picture 1" }));
    await userEvent.click(screen.getByRole("button", { name: /save|publish|update/i }));
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    expect(lastBody().gallery).toEqual([]);
  });
  it("any kind of item can be featured, not only projects", async () => {
    render(<ItemForm initial={{ ...item, type: "book" } as AdminItem} />);
    expect(screen.getByLabelText(/Feature this piece/)).toBeTruthy();
  });
});
