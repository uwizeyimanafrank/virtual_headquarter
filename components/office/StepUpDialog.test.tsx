import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepUpDialog } from "@/components/office/StepUpDialog";
import { api, ApiError } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);
beforeEach(() => mockApi.mockReset());

describe("StepUpDialog", () => {
  it("renders nothing while closed", () => {
    render(<StepUpDialog open={false} onClose={() => {}} onSuccess={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends the code and reports success", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const onSuccess = vi.fn();
    render(<StepUpDialog open onClose={() => {}} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText("Code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mockApi).toHaveBeenCalledWith("/api/admin/stepup", { method: "POST", body: JSON.stringify({ code: "123456" }) });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows an error and does not continue when the code is wrong", async () => {
    mockApi.mockRejectedValueOnce(new ApiError(401, "Invalid code."));
    const onSuccess = vi.fn();
    render(<StepUpDialog open onClose={() => {}} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByPlaceholderText("Code"), "999999");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid code.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("Cancel and Escape close it", async () => {
    const onClose = vi.fn();
    render(<StepUpDialog open onClose={onClose} onSuccess={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.type(screen.getByPlaceholderText("Code"), "{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
