import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginFlow } from "@/components/office/LoginFlow";
import { api, ApiError } from "@/lib/api";
import { hardNavigate } from "@/lib/nav";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("@/lib/nav", () => ({ hardNavigate: vi.fn() }));
const mockApi = vi.mocked(api);

async function signIn() {
  await userEvent.type(screen.getByPlaceholderText("Email"), "me@x.co");
  await userEvent.type(screen.getByPlaceholderText("Password"), "a-long-password");
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
}

beforeEach(() => {
  mockApi.mockReset();
  vi.mocked(hardNavigate).mockReset();
  window.history.pushState({}, "", "/secret-slug-123/login");
});

describe("LoginFlow", () => {
  it("returning owner: password, then authenticator code, then into the Office", async () => {
    mockApi.mockResolvedValueOnce({ ok: true, step: "2fa" }).mockResolvedValueOnce({ ok: true });
    render(<LoginFlow />);
    await signIn();

    expect(mockApi).toHaveBeenNthCalledWith(1, "/api/admin/login", { method: "POST", body: JSON.stringify({ email: "me@x.co", password: "a-long-password" }) });
    expect(await screen.findByPlaceholderText("Code or recovery code")).toBeInTheDocument();
    // The password field is gone, so the typed password no longer sits in the page.
    expect(screen.queryByPlaceholderText("Password")).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Code or recovery code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith("/secret-slug-123"));
    expect(mockApi).toHaveBeenNthCalledWith(2, "/api/admin/2fa/verify", { method: "POST", body: JSON.stringify({ code: "123456" }) });
  });

  it("first login: shows the QR code, then recovery codes that must be acknowledged", async () => {
    mockApi
      .mockResolvedValueOnce({ ok: true, step: "enroll" })
      .mockResolvedValueOnce({ qr: "data:image/png;base64,AAAA", secret: "JBSWY3DPEHPK3PXP" })
      .mockResolvedValueOnce({ ok: true, recoveryCodes: ["aaaaa-bbbbb", "ccccc-ddddd"] });
    render(<LoginFlow />);
    await signIn();

    expect(await screen.findByAltText("Authenticator QR code")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("6-digit code"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Turn on 2FA" }));

    expect(await screen.findByText("aaaaa-bbbbb")).toBeInTheDocument();
    const enter = screen.getByRole("button", { name: "Enter the Office" });
    expect(enter).toBeDisabled(); // cannot continue until the codes are acknowledged
    await userEvent.click(screen.getByRole("checkbox"));
    expect(enter).toBeEnabled();
    await userEvent.click(enter);
    expect(hardNavigate).toHaveBeenCalledWith("/secret-slug-123");
  });

  it("shows the server's message when the password is wrong and stays on the password step", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, "Invalid credentials."));
    render(<LoginFlow />);
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials.");
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it("shows an error for a wrong 2FA code and does not enter", async () => {
    mockApi.mockResolvedValueOnce({ ok: true, step: "2fa" }).mockRejectedValueOnce(new ApiError(401, "Invalid code."));
    render(<LoginFlow />);
    await signIn();
    await userEvent.type(await screen.findByPlaceholderText("Code or recovery code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid code.");
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
