import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TwinAvatar } from "@/components/office/TwinAvatar";
import { api, ApiError } from "@/lib/api";
import { hardNavigate } from "@/lib/nav";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("@/lib/nav", () => ({ hardNavigate: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/secret-slug-123/ai" }));
const mockApi = vi.mocked(api);
beforeEach(() => { mockApi.mockReset(); vi.mocked(hardNavigate).mockReset(); });

const openChat = async () => { await userEvent.click(screen.getByRole("button", { name: "Open AI Twin" })); return screen.getByRole("dialog", { name: "AI Twin chat" }); };
const ask = async (text: string) => { await userEvent.type(screen.getByLabelText("Message"), `${text}{Enter}`); };
const lastBody = () => JSON.parse((mockApi.mock.calls.at(-1)?.[1] as RequestInit).body as string);

describe("TwinAvatar and TwinChat", () => {
  it("shows the avatar button (default or your own picture) and opens the chat", async () => {
    const { rerender } = render(<TwinAvatar />);
    expect(screen.getByRole("button", { name: "Open AI Twin" }).querySelector("img")).toHaveAttribute("src", "/twin.svg");
    rerender(<TwinAvatar avatarUrl="https://res.cloudinary.com/x/image/upload/me.png" />);
    expect(screen.getByRole("button", { name: "Open AI Twin" }).querySelector("img")).toHaveAttribute("src", "https://res.cloudinary.com/x/image/upload/me.png");
    const dialog = await openChat();
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close AI Twin" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Message")).toHaveFocus();
  });

  it("sends a message, shows the thinking state, then the answer", async () => {
    let finish: (v: { reply: string }) => void = () => {};
    mockApi.mockReturnValueOnce(new Promise((r) => { finish = r; }));
    render(<TwinAvatar />);
    const dialog = await openChat();
    await ask("How many projects?");
    expect(within(dialog).getByText("How many projects?")).toBeInTheDocument();
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Thinking");
    expect(mockApi).toHaveBeenCalledWith("/api/admin/ai", expect.objectContaining({ method: "POST" }));
    expect(lastBody()).toEqual({ message: "How many projects?", history: [] });
    finish({ reply: "You have 3 published projects." });
    expect(await within(dialog).findByText("You have 3 published projects.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
  });

  it("sends the earlier conversation as history, but never more than the last 10 turns", async () => {
    mockApi.mockResolvedValue({ reply: "ok" });
    render(<TwinAvatar />);
    await openChat();
    for (let i = 1; i <= 7; i++) await ask(`question ${i}`);
    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(7));
    const body = lastBody();
    expect(body.message).toBe("question 7");
    expect(body.history).toHaveLength(10);
    expect(body.history.at(-1)).toEqual({ role: "model", text: "ok" });
    expect(body.history[0].role).toBe("user");
  });

  it("shows replies as plain text, never as HTML", async () => {
    mockApi.mockResolvedValueOnce({ reply: "<img src=x onerror=alert(1)> and <script>alert(2)</script>" });
    render(<TwinAvatar />);
    const dialog = await openChat();
    await ask("hi");
    expect(await within(dialog).findByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
    expect(dialog.querySelector("script")).toBeNull();
    expect(dialog.querySelectorAll("img[onerror]").length).toBe(0);
  });

  it("Enter sends, Shift+Enter makes a new line, empty messages are not sent", async () => {
    mockApi.mockResolvedValue({ reply: "ok" });
    render(<TwinAvatar />);
    await openChat();
    const box = screen.getByLabelText("Message");
    await userEvent.type(box, "{Enter}");
    expect(mockApi).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await userEvent.type(box, "line one{Shift>}{Enter}{/Shift}line two");
    expect(mockApi).not.toHaveBeenCalled();
    expect(box).toHaveValue("line one\nline two");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(1));
    expect(lastBody().message).toBe("line one\nline two");
  });

  it("shows the server's friendly message when something fails, and lets you try again", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(503, "The AI Twin is not set up yet. Add GEMINI_API_KEY to your settings (see Setup, Config Doctor)."));
    render(<TwinAvatar />);
    const dialog = await openChat();
    await ask("hello");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("not set up yet");
    expect(screen.getByLabelText("Message")).toBeEnabled();
  });

  it("a network failure gets a friendly message", async () => {
    mockApi.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<TwinAvatar />);
    const dialog = await openChat();
    await ask("hello");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Could not reach the AI Twin/);
  });

  it("if the session ended it sends you to the sign-in page", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, "Not signed in."));
    render(<TwinAvatar />);
    await openChat();
    await ask("hello");
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith("/secret-slug-123/login"));
  });

  it("Escape closes the chat and focus goes back to the avatar", async () => {
    render(<TwinAvatar />);
    await openChat();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open AI Twin" })).toHaveFocus();
  });

  it("suggestion buttons send a question, and Clear starts over", async () => {
    mockApi.mockResolvedValueOnce({ reply: "Doing fine." });
    render(<TwinAvatar />);
    const dialog = await openChat();
    await userEvent.click(within(dialog).getByRole("button", { name: "How is my site doing?" }));
    expect(await within(dialog).findByText("Doing fine.")).toBeInTheDocument();
    expect(lastBody().message).toBe("How is my site doing?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Clear" }));
    expect(within(dialog).queryByText("Doing fine.")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "How is my site doing?" })).toBeInTheDocument();
  });
});
