import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageSlots } from "@/components/office/ImageSlots";
import { api, ApiError } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
// The real Uploader talks to Cloudinary; here a button stands in for "a picture was uploaded".
vi.mock("@/components/office/Uploader", () => ({
  Uploader: ({ onChange }: { onChange: (u: string) => void }) => <button onClick={() => onChange("https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/new.jpg")}>mock upload</button>,
}));
const mockApi = vi.mocked(api);

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/old.jpg";
const NEW = "https://res.cloudinary.com/demo/image/upload/v1/vhq/slot/new.jpg";
const row = (o: Record<string, unknown>) => ({ aspect: "16:9", minWidth: 1600, defaultSrc: "/art/defaults/wide.svg", decorative: true, custom: null, section: "x", ...o });
const SLOTS = [
  row({ key: "home.hero.bg", label: "Hero background", page: "Home", where: "Home, behind everything" }),
  row({ key: "home.profile.photo", label: "Profile photo", page: "Home", where: "Home, profile card", aspect: "1:1", decorative: false }),
  row({ key: "museum.backdrop", label: "Museum header", page: "Museum", where: "Museum, top", custom: { url: CLOUD, alt: "", focal: { x: 10, y: 20 }, credit: "Frank", license: "mine", kind: "upload" } }),
];

async function load(library: string[] = []) {
  mockApi.mockResolvedValueOnce({ slots: SLOTS, library });
  render(<ImageSlots />);
  await screen.findByText("Hero background");
}
const card = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

beforeEach(() => mockApi.mockReset());

describe("ImageSlots", () => {
  it("lists slots grouped by page with where they show and whether they are customised", async () => {
    await load();
    expect(screen.getByRole("region", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Museum" })).toBeInTheDocument();
    expect(screen.getByText("Home, behind everything")).toBeInTheDocument();
    expect(within(card("Hero background")).getByText("Default")).toBeInTheDocument();
    expect(within(card("Museum header")).getByText("Your picture")).toBeInTheDocument();
    expect(within(card("Hero background")).getByText(/Best shape 16:9, at least 1600px/)).toBeInTheDocument();
  });

  it("replaces a picture: upload, save, and the slot shows as yours", async () => {
    await load();
    await userEvent.click(screen.getByRole("button", { name: "Replace Hero background" }));
    expect(screen.getByRole("button", { name: "Save picture" })).toBeDisabled(); // nothing chosen yet
    await userEvent.click(screen.getByText("mock upload"));
    mockApi.mockResolvedValueOnce({ ok: true });
    await userEvent.click(screen.getByRole("button", { name: "Save picture" }));
    await waitFor(() => expect(within(card("Hero background")).getByText("Your picture")).toBeInTheDocument());
    const [path, init] = mockApi.mock.calls[1];
    expect(path).toBe("/api/admin/slots/home.hero.bg");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({ url: NEW, kind: "upload", focal: { x: 50, y: 50 } });
  });

  it("asks for a description when the picture carries meaning", async () => {
    await load();
    await userEvent.click(screen.getByRole("button", { name: "Replace Profile photo" }));
    await userEvent.click(screen.getByText("mock upload"));
    expect(screen.getByRole("button", { name: "Save picture" })).toBeDisabled();
    expect(screen.getByText(/Add a short description/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Description of the picture/), "Frank at his desk");
    expect(screen.getByRole("button", { name: "Save picture" })).toBeEnabled();
  });

  it("can reuse a picture that is already on the site", async () => {
    await load([CLOUD]);
    await userEvent.click(screen.getByRole("button", { name: "Replace Hero background" }));
    await userEvent.click(screen.getByRole("button", { name: "Use this picture" }));
    mockApi.mockResolvedValueOnce({ ok: true });
    await userEvent.click(screen.getByRole("button", { name: "Save picture" }));
    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String((mockApi.mock.calls[1][1] as RequestInit).body))).toMatchObject({ url: CLOUD, kind: "library" });
  });

  it("sets the focus point by clicking the preview, and by arrow keys", async () => {
    await load();
    await userEvent.click(screen.getByRole("button", { name: "Replace Hero background" }));
    const preview = screen.getByRole("button", { name: "Focus point preview" });
    preview.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} });
    fireEvent.click(preview, { clientX: 50, clientY: 75 });
    expect(screen.getByText("Focus: 25% across, 75% down")).toBeInTheDocument();
    fireEvent.keyDown(preview, { key: "ArrowRight" });
    expect(screen.getByText("Focus: 30% across, 75% down")).toBeInTheDocument();
  });

  it("resets to the default only after a second click", async () => {
    await load();
    await userEvent.click(screen.getByRole("button", { name: "Reset Museum header to default" }));
    expect(mockApi).toHaveBeenCalledTimes(1); // only the list call so far
    mockApi.mockResolvedValueOnce({ ok: true });
    await userEvent.click(screen.getByRole("button", { name: "Yes, reset" }));
    await waitFor(() => expect(within(card("Museum header")).getByText("Default")).toBeInTheDocument());
    expect(mockApi).toHaveBeenLastCalledWith("/api/admin/slots/museum.backdrop", { method: "DELETE" });
  });

  it("shows the server's message when saving fails, and keeps the editor open", async () => {
    await load();
    await userEvent.click(screen.getByRole("button", { name: "Replace Hero background" }));
    await userEvent.click(screen.getByText("mock upload"));
    mockApi.mockRejectedValueOnce(new ApiError(400, "Use a picture stored in your Cloudinary."));
    await userEvent.click(screen.getByRole("button", { name: "Save picture" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/stored in your Cloudinary/);
    expect(screen.getByRole("button", { name: "Save picture" })).toBeInTheDocument();
  });

  it("shows a message when the list cannot load", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(500, "Server error."));
    render(<ImageSlots />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error.");
  });
});
