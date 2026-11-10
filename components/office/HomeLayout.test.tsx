import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeLayout } from "@/components/office/HomeLayout";
import { api, ApiError } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);

const fld = (name: string, label: string, def: string, long = false) => ({ name, label, max: 60, long, default: def });
const blocks = () => [
  { key: "hero", label: "Hero", description: "First screen.", required: true, ready: true, enabled: true, content: {}, fields: [] },
  { key: "stats", label: "Stats strip", description: "Numbers.", required: false, ready: false, enabled: true, content: { title: "At a glance" }, fields: [fld("title", "Heading", "At a glance")] },
  { key: "hire", label: "Hire band", description: "Invite offers.", required: false, ready: false, enabled: true, content: { title: "Hire me", text: "Tell me." }, fields: [fld("title", "Heading", "Hire me"), fld("text", "Text", "Tell me.", true)] },
];
const load = async () => { mockApi.mockResolvedValueOnce({ blocks: blocks() }); render(<HomeLayout />); await screen.findByText("Stats strip"); };
const li = (label: string) => screen.getByText(label).closest("li") as HTMLElement;
const names = () => screen.getAllByRole("listitem").map((x) => within(x).getAllByRole("button")[0] && x.querySelector("p.font-medium")?.textContent);

beforeEach(() => mockApi.mockReset());

describe("HomeLayout", () => {
  it("lists blocks in order and explains the ones that are not built yet", async () => {
    await load();
    expect(names()).toEqual(["Hero", "Stats strip", "Hire band"]);
    expect(within(li("Hero")).getByText("Always on")).toBeInTheDocument();
    expect(within(li("Stats strip")).getByText(/Coming soon/)).toBeInTheDocument();
    expect(within(li("Hero")).queryByText(/Coming soon/)).toBeNull();
  });
  it("keeps the always-on block switched on and cannot move it above the top", async () => {
    await load();
    expect(screen.getByLabelText("Show Hero")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Hero up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Hire band down" })).toBeDisabled();
  });
  it("moves blocks, switches them, edits text, and only then offers Save", async () => {
    await load();
    expect(screen.getByRole("button", { name: "Save layout" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Move Hire band up" }));
    expect(names()).toEqual(["Hero", "Hire band", "Stats strip"]);
    await userEvent.click(screen.getByLabelText("Show Stats strip"));
    await userEvent.click(screen.getByRole("button", { name: "Edit the text of Hire band" }));
    const heading = within(li("Hire band")).getByLabelText("Heading");
    await userEvent.clear(heading); await userEvent.type(heading, "Hire Frank");
    expect(screen.getByText(/unsaved changes/)).toBeInTheDocument();
    mockApi.mockResolvedValueOnce({ blocks: blocks() });
    await userEvent.click(screen.getByRole("button", { name: "Save layout" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Saved/));
    const [path, init] = mockApi.mock.calls[1];
    expect(path).toBe("/api/admin/home-blocks");
    expect((init as RequestInit).method).toBe("PUT");
    const sent = JSON.parse(String((init as RequestInit).body)).blocks;
    expect(sent.map((b: { key: string }) => b.key)).toEqual(["hero", "hire", "stats"]);
    expect(sent.find((b: { key: string }) => b.key === "stats").enabled).toBe(false);
    expect(sent.find((b: { key: string }) => b.key === "hire").content.title).toBe("Hire Frank");
    expect(screen.queryByText(/unsaved changes/)).toBeNull();
  });
  it("shows the server's message when saving fails and keeps the edits", async () => {
    await load();
    await userEvent.click(screen.getByLabelText("Show Stats strip"));
    mockApi.mockRejectedValueOnce(new ApiError(400, "\"Heading\" is too long (60 characters at most)."));
    await userEvent.click(screen.getByRole("button", { name: "Save layout" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/too long/);
    expect(screen.getByText(/unsaved changes/)).toBeInTheDocument();
  });
  it("resets only after a second click", async () => {
    await load();
    await userEvent.click(screen.getByRole("button", { name: "Reset to built-in layout" }));
    expect(mockApi).toHaveBeenCalledTimes(1);
    mockApi.mockResolvedValueOnce({ blocks: blocks() });
    await userEvent.click(screen.getByRole("button", { name: "Yes, reset everything" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/built-in layout/));
    expect(mockApi).toHaveBeenLastCalledWith("/api/admin/home-blocks", { method: "DELETE" });
  });
  it("shows a message when it cannot load", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(500, "Server error."));
    render(<HomeLayout />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server error.");
  });
});
