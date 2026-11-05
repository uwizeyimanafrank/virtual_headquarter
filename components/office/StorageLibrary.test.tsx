import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StorageLibrary } from "@/components/office/StorageLibrary";
import { api } from "@/lib/api";
import type { ServiceView } from "@/lib/services/view";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);
beforeEach(() => mockApi.mockReset());

const svc = (id: string, name: string, bytes: number | null): ServiceView => ({
  id, name, type: "mongodb", baseUrl: "", healthPath: "/", enabled: true, limitBytes: null, hasCredentials: false,
  lastCheck: { at: null, status: "up", message: "", metrics: bytes === null ? [] : [{ key: "storage", label: "Storage", value: bytes, unit: "bytes", limit: 1024 * 1048576 }] },
});

describe("StorageLibrary", () => {
  it("shows each service and a total that is the sum", async () => {
    mockApi.mockResolvedValueOnce({ services: [svc("1", "Atlas", 100 * 1048576), svc("2", "Media", 50 * 1048576), svc("3", "Render", null)] });
    render(<StorageLibrary />);
    expect(await screen.findByText("Atlas")).toBeInTheDocument();
    expect(screen.getByTestId("total")).toHaveTextContent("150 MB");
    expect(screen.getByText("no storage data")).toBeInTheDocument();
    expect(screen.getByText(/across 2 services/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Share of the total/ })).toBeInTheDocument();
  });
  it("says what to do when there is nothing yet", async () => {
    mockApi.mockResolvedValueOnce({ services: [] });
    render(<StorageLibrary />);
    expect(await screen.findByText(/Add services in the Developer tab first/)).toBeInTheDocument();
    expect(screen.getByTestId("total")).toHaveTextContent("0 B");
  });
});
