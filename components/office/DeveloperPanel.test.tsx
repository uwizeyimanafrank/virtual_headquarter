import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeveloperPanel } from "@/components/office/DeveloperPanel";
import { api, ApiError } from "@/lib/api";
import type { ServiceView } from "@/lib/services/view";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);

const svc = (over: Partial<ServiceView> = {}): ServiceView => ({
  id: "a".repeat(24), name: "My database", type: "mongodb", baseUrl: "", healthPath: "/", enabled: true, limitBytes: null, hasCredentials: false,
  lastCheck: { at: "2026-10-31T10:00:00Z", status: "up", message: "Connected.", metrics: [{ key: "storage", label: "Storage used", value: 256 * 1048576, unit: "bytes", limit: 512 * 1048576 }] },
  ...over,
});
const list = (services: ServiceView[], checked = 0) => ({ services, checked });
const calls = () => mockApi.mock.calls.map(([path, init]) => [path, (init as RequestInit | undefined)?.method ?? "GET", init && (init as RequestInit).body ? JSON.parse((init as RequestInit).body as string) : undefined] as const);
beforeEach(() => { mockApi.mockReset(); vi.spyOn(window, "confirm").mockReturnValue(true); });

describe("DeveloperPanel", () => {
  it("checks on load and shows each service with its status, message and usage bar", async () => {
    mockApi.mockResolvedValueOnce(list([svc(), svc({ id: "b".repeat(24), name: "Client API", type: "http", lastCheck: { at: null, status: "down", message: "No answer within 5 seconds.", metrics: [] } })]));
    render(<DeveloperPanel />);
    expect(await screen.findByText("My database")).toBeInTheDocument();
    expect(calls()[0]).toEqual(["/api/admin/services/check", "POST", {}]);
    expect(screen.getByText("Connected.")).toBeInTheDocument();
    expect(screen.getByText("Down")).toBeInTheDocument();
    expect(screen.getByText("No answer within 5 seconds.")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Storage used" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("256 MB of 512 MB")).toBeInTheDocument();
    expect(screen.getByText("Never checked")).toBeInTheDocument();
  });

  it("explains an empty dashboard", async () => {
    mockApi.mockResolvedValueOnce(list([]));
    render(<DeveloperPanel />);
    expect(await screen.findByText(/Nothing is being watched yet/)).toBeInTheDocument();
  });

  it("adds a website check without sending any credentials", async () => {
    mockApi.mockResolvedValueOnce(list([])).mockResolvedValueOnce({ service: svc() }).mockResolvedValueOnce(list([svc()]));
    render(<DeveloperPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Add a service" }));
    const dialog = screen.getByRole("dialog", { name: "Add a service" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "My site");
    await userEvent.type(within(dialog).getByLabelText("Address"), "https://example.org");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const post = calls().find(([p, m]) => p === "/api/admin/services" && m === "POST")!;
    expect(post[2]).toEqual({ name: "My site", healthPath: "/", enabled: true, limitMb: null, baseUrl: "https://example.org", type: "http" });
    expect(calls().filter(([p]) => p === "/api/admin/services/check")).toHaveLength(2); // reloaded after saving
  });

  it("secret fields are password boxes, and saving credentials asks for a fresh authenticator code then retries", async () => {
    mockApi.mockResolvedValueOnce(list([]));
    render(<DeveloperPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Add a service" }));
    const dialog = screen.getByRole("dialog", { name: "Add a service" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Kind"), "render");
    expect(within(dialog).getByLabelText("Render API key")).toHaveAttribute("type", "password");
    await userEvent.type(within(dialog).getByLabelText("Name"), "Prod");
    await userEvent.type(within(dialog).getByLabelText("Render API key"), "rnd_secret_key_1");
    await userEvent.type(within(dialog).getByLabelText("Service ID"), "srv-abc12345");

    mockApi.mockRejectedValueOnce(new ApiError(401, "Please confirm with your authenticator code.", { code: "STEP_UP_REQUIRED" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const stepUp = await screen.findByRole("dialog", { name: "Confirm it is you" });
    mockApi.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ service: svc() }).mockResolvedValueOnce(list([svc()]));
    await userEvent.type(within(stepUp).getByPlaceholderText("Code"), "123456");
    await userEvent.click(within(stepUp).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const order = calls().map(([p, m]) => `${m} ${p}`);
    expect(order.slice(1, 4)).toEqual(["POST /api/admin/services", "POST /api/admin/stepup", "POST /api/admin/services"]); // tried, confirmed, retried
    const retried = calls().filter(([p, m]) => p === "/api/admin/services" && m === "POST").at(-1)![2] as { credentials: Record<string, string> };
    expect(retried.credentials).toEqual({ apiKey: "rnd_secret_key_1", serviceId: "srv-abc12345" });
  });

  it("a saved secret is never shown on the page again", async () => {
    mockApi.mockResolvedValueOnce(list([])).mockResolvedValueOnce({ service: svc({ type: "render", hasCredentials: true }) }).mockResolvedValueOnce(list([svc({ type: "render", hasCredentials: true })]));
    render(<DeveloperPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Add a service" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText("Kind"), "render");
    await userEvent.type(within(dialog).getByLabelText("Name"), "Prod");
    await userEvent.type(within(dialog).getByLabelText("Render API key"), "TOP-SECRET-KEY-99");
    await userEvent.type(within(dialog).getByLabelText("Service ID"), "srv-abc12345");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.innerHTML).not.toContain("TOP-SECRET-KEY-99");
    expect(screen.getByText(/credentials stored/)).toBeInTheDocument();
  });

  it("editing leaves stored credentials alone unless you type new ones, and can remove them", async () => {
    const s = svc({ hasCredentials: true, type: "render", name: "Prod" });
    mockApi.mockResolvedValueOnce(list([s]));
    render(<DeveloperPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    let dialog = screen.getByRole("dialog", { name: "Edit service" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Prod");
    expect(within(dialog).getByLabelText("Render API key")).toHaveValue("");
    expect(within(dialog).getByLabelText("Render API key")).toHaveAttribute("placeholder", "Stored. Leave blank to keep.");
    expect(within(dialog).queryByLabelText("Kind")).not.toBeInTheDocument(); // the kind cannot change

    mockApi.mockResolvedValueOnce({ service: s }).mockResolvedValueOnce(list([s]));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const patch = calls().find(([, m]) => m === "PATCH")!;
    expect(patch[0]).toBe(`/api/admin/services/${s.id}`);
    expect(patch[2]).not.toHaveProperty("credentials");
    expect(patch[2]).not.toHaveProperty("clearCredentials");

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    dialog = screen.getByRole("dialog", { name: "Edit service" });
    mockApi.mockResolvedValueOnce({ service: s }).mockResolvedValueOnce(list([s]));
    await userEvent.click(within(dialog).getByLabelText("Remove the stored credentials"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(calls().filter(([, m]) => m === "PATCH")).toHaveLength(2));
    expect(calls().filter(([, m]) => m === "PATCH")[1][2]).toMatchObject({ clearCredentials: true });
  });

  it("shows the problems the server found with the form", async () => {
    mockApi.mockResolvedValueOnce(list([]));
    render(<DeveloperPanel />);
    await userEvent.click(await screen.findByRole("button", { name: "Add a service" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Name"), "x");
    await userEvent.type(within(dialog).getByLabelText("Address"), "javascript:alert(1)");
    mockApi.mockRejectedValueOnce(new ApiError(400, "Please check the fields.", { issues: [{ path: "baseUrl", message: "must be a web address" }] }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("baseUrl: must be a web address");
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // stays open so you can fix it
  });

  it("removing asks first, and needs a fresh code", async () => {
    const s = svc();
    mockApi.mockResolvedValueOnce(list([s]));
    render(<DeveloperPanel />);
    const remove = await screen.findByRole("button", { name: "Remove" });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await userEvent.click(remove);
    expect(calls().some(([, m]) => m === "DELETE")).toBe(false);

    mockApi.mockRejectedValueOnce(new ApiError(401, "Please confirm.", { code: "STEP_UP_REQUIRED" }));
    await userEvent.click(remove);
    const stepUp = await screen.findByRole("dialog", { name: "Confirm it is you" });
    mockApi.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(list([]));
    await userEvent.type(within(stepUp).getByPlaceholderText("Code"), "123456");
    await userEvent.click(within(stepUp).getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(calls().filter(([, m]) => m === "DELETE")).toHaveLength(2));
  });

  it("'Check now' asks for a forced check, and explains when it was too soon", async () => {
    const s = svc();
    mockApi.mockResolvedValueOnce(list([s]));
    render(<DeveloperPanel />);
    mockApi.mockResolvedValueOnce(list([s], 0));
    await userEvent.click(await screen.findByRole("button", { name: "Check now" }));
    expect(calls().at(-1)).toEqual(["/api/admin/services/check", "POST", { ids: [s.id], force: true }]);
    expect(await screen.findByRole("status")).toHaveTextContent(/checked moments ago/);
  });

  it("paused services cannot be checked and look paused", async () => {
    mockApi.mockResolvedValueOnce(list([svc({ enabled: false })]));
    render(<DeveloperPanel />);
    expect(await screen.findByText(/paused/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check now" })).toBeDisabled();
  });
});
