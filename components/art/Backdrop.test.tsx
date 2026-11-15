import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Backdrop } from "@/components/art/Backdrop";

vi.mock("@/components/art/SceneImage", () => ({ SceneImage: ({ slot, parallax }: { slot: string; parallax?: boolean }) => <div data-testid="scene" data-slot-name={slot} data-parallax={String(parallax)} /> }));

describe("Backdrop", () => {
  it("shows the page's image slot, hidden from screen readers, never blocking clicks", () => {
    const { container, getByTestId } = render(<Backdrop slot="museum.backdrop" />);
    const box = container.firstChild as HTMLElement;
    expect(getByTestId("scene").getAttribute("data-slot-name")).toBe("museum.backdrop");
    expect(box.getAttribute("aria-hidden")).toBe("true");
    expect(box.className).toContain("pointer-events-none");
    expect(box.className).toContain("-z-10"); // behind the title
    expect(box.getAttribute("data-backdrop")).toBe("museum.backdrop");
  });
  it("fades into the page so the title stays readable, and keeps the scene still (no parallax behind text)", () => {
    const { container, getByTestId } = render(<Backdrop slot="connect.backdrop" />);
    expect(container.innerHTML).toContain("to-bg");
    expect(getByTestId("scene").getAttribute("data-parallax")).toBe("false");
  });
  it("lets a page choose the height", () => {
    const { container } = render(<Backdrop slot="museum.backdrop" className="h-80" />);
    expect((container.firstChild as HTMLElement).className).toContain("h-80");
  });
});
