import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CLIPBOARD_CLEAR_MS, REVEAL_SECONDS, VaultPanel } from "@/components/office/VaultPanel";
import { api, ApiError } from "@/lib/api";
import { sealSecret } from "@/lib/vault-entry";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);

// With fake timers on, userEvent must be told how to move the clock.
// (userEvent.setup() also replaces navigator.clipboard, so the recording clipboard is put back afterwards.)
const U = () => {
  const u = vi.isFakeTimers() ? userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) }) : userEvent.setup();
  installClipboard();
  return u;
};
function installClipboard() {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn(async (t: string) => { clip.push(t); }) } });
}
const PASS = "correct horse battery";
const ENV = "# prod\nSTRIPE_KEY=sk_live_SECRET123\nDB_URL=mongodb://u:p@h/db";
let payload = "";
let clip: string[] = [];

beforeEach(async () => {
  mockApi.mockReset();
  clip = [];
  installClipboard();
  payload ||= await sealSecret(PASS, { label: "Render production", project: "VHQ", content: ENV });
});
afterEach(() => { vi.useRealTimers(); });

async function openList() {
  mockApi.mockResolvedValueOnce({ entries: [{ id: "a".repeat(24), payload, createdAt: "2026-11-01T10:00:00Z" }], max: 200 });
  render(<VaultPanel />);
  await U().click(screen.getByRole("button", { name: "Open the vault" }));
  await screen.findByText("Encrypted entry");
}
async function reveal(pass = PASS) {
  await U().click(screen.getByRole("button", { name: "Unlock" }));
  await U().type(screen.getByPlaceholderText("Passphrase for this entry"), pass);
  await U().click(screen.getByRole("button", { name: "Reveal" }));
}

describe("VaultPanel", () => {
  it("starts locked and warns that a lost passphrase cannot be recovered", () => {
    render(<VaultPanel />);
    expect(screen.getByRole("button", { name: "Open the vault" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/cannot be recovered/);
    expect(mockApi).not.toHaveBeenCalled();
  });

  it("lists entries without showing any text from inside them", async () => {
    await openList();
    expect(screen.queryByText(/Render production/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("SECRET123");
  });

  it("a wrong passphrase reveals nothing", async () => {
    await openList();
    await reveal("totally wrong passphrase");
    expect(await screen.findByRole("alert")).toHaveTextContent(/does not open/);
    expect(document.body.textContent).not.toContain("Render production");
    expect(document.body.textContent).not.toContain("SECRET123");
    expect(screen.queryByTestId("value-STRIPE_KEY")).not.toBeInTheDocument();
  }, 30000);

  it("the right passphrase shows the entry with values masked, each revealable on its own", async () => {
    await openList();
    await reveal();
    expect(await screen.findByText("Render production")).toBeInTheDocument();
    expect(screen.getByTestId("value-STRIPE_KEY")).toHaveTextContent("••••");
    expect(document.body.textContent).not.toContain("SECRET123");
    await U().click(screen.getByRole("button", { name: "Show STRIPE_KEY" }));
    expect(screen.getByTestId("value-STRIPE_KEY")).toHaveTextContent("sk_live_SECRET123");
    expect(screen.getByTestId("value-DB_URL")).toHaveTextContent("••••");
  }, 30000);

  it("hides itself after the countdown", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true }); // before the entry opens, so its timers are fake
    await openList();
    await reveal();
    await screen.findByText("Render production");
    await act(async () => { await vi.advanceTimersByTimeAsync((REVEAL_SECONDS + 1) * 1000); });
    expect(screen.queryByText("Render production")).not.toBeInTheDocument();
    expect(screen.getByText("Encrypted entry")).toBeInTheDocument();
  }, 30000);

  it("hides the moment the window loses focus", async () => {
    await openList();
    await reveal();
    await screen.findByText("Render production");
    fireEvent.blur(window);
    expect(screen.queryByText("Render production")).not.toBeInTheDocument();
  }, 30000);

  it("hides when the tab becomes hidden", async () => {
    await openList();
    await reveal();
    await screen.findByText("Render production");
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    fireEvent(document, new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    expect(screen.queryByText("Render production")).not.toBeInTheDocument();
  }, 30000);

  it("copies one value and wipes the clipboard after the timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openList();
    await reveal();
    await screen.findByText("Render production");
    await U().click(screen.getByRole("button", { name: "Copy STRIPE_KEY" }));
    expect(clip).toEqual(["sk_live_SECRET123"]);
    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS + 100); });
    expect(clip.at(-1)).toBe("");
  }, 30000);

  it("wipes the clipboard even if the entry is hidden early", async () => {
    await openList();
    await reveal();
    await screen.findByText("Render production");
    await U().click(screen.getByRole("button", { name: "Copy STRIPE_KEY" }));
    await U().click(screen.getByRole("button", { name: "Hide now" }));
    await waitFor(() => expect(clip.at(-1)).toBe(""));
  }, 30000);

  it("asks for an authenticator code when the server says so, then continues", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, "Please confirm it is you."));
    render(<VaultPanel />);
    await U().click(screen.getByRole("button", { name: "Open the vault" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    mockApi.mockResolvedValueOnce({ ok: true }); // step-up
    mockApi.mockResolvedValueOnce({ entries: [], max: 200 }); // retry of the list
    await U().type(screen.getByPlaceholderText("Code"), "123456");
    await U().click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it("add form: sends only the encrypted payload, never text or the passphrase", async () => {
    mockApi.mockResolvedValueOnce({ entries: [], max: 200 });
    render(<VaultPanel />);
    await U().click(screen.getByRole("button", { name: "Open the vault" }));
    await U().click(await screen.findByRole("button", { name: "Add entry" }));
    await U().type(screen.getByLabelText("Name"), "My keys");
    fireEvent.change(screen.getByLabelText(/Paste your .env text/), { target: { value: "TOKEN=plain-secret-999" } });
    const save = screen.getByRole("button", { name: "Encrypt and save" });
    expect(save).toBeDisabled();
    await U().type(screen.getByLabelText("Passphrase"), "my-long-passphrase-1");
    await U().type(screen.getByLabelText("Type it again"), "my-long-passphrase-1");
    expect(save).toBeDisabled(); // must tick the warning first
    await U().click(screen.getByRole("checkbox"));
    expect(save).toBeEnabled();
    mockApi.mockResolvedValueOnce({ id: "b".repeat(24) });
    await U().click(save);
    await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(2));
    const [path, init] = mockApi.mock.calls[1];
    expect(path).toBe("/api/admin/vault");
    const body = String((init as RequestInit).body);
    expect(body).not.toContain("plain-secret-999");
    expect(body).not.toContain("My keys");
    expect(body).not.toContain("my-long-passphrase-1");
    expect(JSON.parse(JSON.parse(body).payload).v).toBe(1);
  }, 30000);

  it("add form: refuses a weak passphrase and a mismatch", async () => {
    mockApi.mockResolvedValueOnce({ entries: [], max: 200 });
    render(<VaultPanel />);
    await U().click(screen.getByRole("button", { name: "Open the vault" }));
    await U().click(await screen.findByRole("button", { name: "Add entry" }));
    await U().type(screen.getByLabelText("Name"), "x");
    fireEvent.change(screen.getByLabelText(/Paste your .env text/), { target: { value: "A=1" } });
    await U().type(screen.getByLabelText("Passphrase"), "short");
    await U().type(screen.getByLabelText("Type it again"), "short");
    await U().click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Encrypt and save" })).toBeDisabled();
    await U().type(screen.getByLabelText("Passphrase"), "-and-much-longer-now");
    expect(await screen.findByText(/two passphrases are different/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encrypt and save" })).toBeDisabled();
  }, 30000);

  it("delete asks twice", async () => {
    await openList();
    await U().click(screen.getByRole("button", { name: "Delete" }));
    expect(mockApi).toHaveBeenCalledTimes(1); // only the list call so far
    mockApi.mockResolvedValueOnce({ ok: true });
    await U().click(screen.getByRole("button", { name: "Yes, delete forever" }));
    await waitFor(() => expect(mockApi).toHaveBeenLastCalledWith(`/api/admin/vault/${"a".repeat(24)}`, { method: "DELETE" }));
    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
  });
});
