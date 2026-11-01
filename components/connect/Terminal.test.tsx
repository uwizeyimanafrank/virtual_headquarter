import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectTerminal } from "@/components/connect/Terminal";
import { api, ApiError } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);
beforeEach(() => mockApi.mockReset());

async function fill(name = "Ada", email = "ada@example.com", message = "Hello there") {
  await userEvent.type(screen.getByLabelText(/\$ name/), name);
  await userEvent.type(screen.getByLabelText(/\$ email/), email);
  await userEvent.type(screen.getByLabelText(/\$ message/), message);
}
const send = () => userEvent.click(screen.getByRole("button", { name: /Send message|Sending/ }));

describe("ConnectTerminal", () => {
  it("has the three labelled fields and no outside links", () => {
    render(<ConnectTerminal />);
    for (const l of [/\$ name/, /\$ email/, /\$ message/]) expect(screen.getByLabelText(l)).toBeInTheDocument();
    expect(document.querySelectorAll("a").length).toBe(0); // no GitHub or social links, by design
  });

  it("the bot trap is invisible and unreachable for people", () => {
    render(<ConnectTerminal />);
    const trap = document.getElementById("c-website") as HTMLInputElement;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.value).toBe("");
  });

  it("sends trimmed text with an empty trap, then confirms and clears the form", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    render(<ConnectTerminal />);
    await fill("  Ada ", " ada@example.com ", "  Hello there  ");
    await send();
    expect(mockApi).toHaveBeenCalledWith("/api/connect", { method: "POST", body: JSON.stringify({ name: "Ada", email: "ada@example.com", message: "Hello there", website: "" }) });
    expect(await screen.findByText(/Message received/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send another" }));
    expect(screen.getByLabelText(/\$ name/)).toHaveValue("");
    expect(screen.getByLabelText(/\$ message/)).toHaveValue("");
  });

  it("a bot that fills the trap still posts it, so the server can ignore it", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    render(<ConnectTerminal />);
    await fill();
    fireEvent.change(document.getElementById("c-website") as HTMLInputElement, { target: { value: "http://spam.example" } });
    await send();
    expect(JSON.parse((mockApi.mock.calls[0][1] as RequestInit).body as string).website).toBe("http://spam.example");
  });

  it("disables the button while sending and blocks a double submit", async () => {
    let finish: (v: unknown) => void = () => {};
    mockApi.mockReturnValueOnce(new Promise((r) => { finish = r; }));
    render(<ConnectTerminal />);
    await fill();
    await send();
    const busy = await screen.findByRole("button", { name: "Sending..." });
    expect(busy).toBeDisabled();
    fireEvent.submit(busy.closest("form") as HTMLFormElement); // a second submit while the first is running
    expect(mockApi).toHaveBeenCalledTimes(1);
    finish({ ok: true });
    expect(await screen.findByText(/Message received/)).toBeInTheDocument();
  });

  it.each([
    [429, /a few messages already/],
    [400, /does not look right/],
    [500, /could not be sent right now/],
    [403, /could not be sent right now/],
  ])("shows a friendly message for a %i answer and keeps what you typed", async (status, text) => {
    mockApi.mockRejectedValueOnce(new ApiError(status, "SERVER SECRET DETAIL"));
    render(<ConnectTerminal />);
    await fill();
    await send();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(alert).not.toHaveTextContent("SERVER SECRET DETAIL"); // raw server wording is never shown
    expect(screen.getByLabelText(/\$ message/)).toHaveValue("Hello there");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled(); // can try again
  });

  it("a network failure also gets the friendly message", async () => {
    mockApi.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<ConnectTerminal />);
    await fill();
    await send();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be sent right now/);
  });

  it("limits the message length and shows a counter", async () => {
    render(<ConnectTerminal />);
    const box = screen.getByLabelText(/\$ message/);
    expect(box).toHaveAttribute("maxlength", "2000");
    await userEvent.type(box, "abc");
    expect(screen.getByText("3/2000")).toBeInTheDocument();
  });

  it("does not send an empty form (fields are required)", async () => {
    render(<ConnectTerminal />);
    await send();
    expect(mockApi).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });
});
