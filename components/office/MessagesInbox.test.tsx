import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessagesInbox } from "@/components/office/MessagesInbox";
import { api } from "@/lib/api";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
const mockApi = vi.mocked(api);
beforeEach(() => mockApi.mockReset());

describe("MessagesInbox", () => {
  it("shows hostile message text as plain text and never as HTML", async () => {
    mockApi.mockResolvedValue({
      unread: 1,
      messages: [{ id: "1", name: "<img src=x onerror=alert(1)>", email: "bad@example.com", body: "<script>alert(1)</script>\n<b>bold?</b> <a href=\"javascript:alert(2)\">click</a>", read: false, archived: false, createdAt: "2026-10-31T10:00:00Z" }],
    });
    const { container } = render(<MessagesInbox />);
    expect(await screen.findByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
  });
});
