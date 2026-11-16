import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { CursorGlow } from "@/components/site/CursorGlow";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { mockMedia } from "@/tests/media-query";

afterEach(() => vi.unstubAllGlobals());

describe("CursorGlow", () => {
  it("shows on a desktop with a mouse", () => {
    mockMedia({ "pointer: fine": true });
    expect(render(<CursorGlow />).queryByTestId("cursor-glow")).not.toBeNull();
  });
  it("is absent on touch screens", () => {
    mockMedia({});
    expect(render(<CursorGlow />).queryByTestId("cursor-glow")).toBeNull();
  });
  it("is absent when the visitor prefers reduced motion, even with a mouse", () => {
    mockMedia({ "pointer: fine": true, "prefers-reduced-motion: reduce": true });
    expect(render(<CursorGlow />).queryByTestId("cursor-glow")).toBeNull();
  });
  it("follows the pointer", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { cb(0); return 1; });
    mockMedia({ "pointer: fine": true });
    const { getByTestId } = render(<CursorGlow />);
    act(() => { fireEvent(window, new MouseEvent("pointermove", { clientX: 300, clientY: 500 })); });
    expect(getByTestId("cursor-glow").style.transform).toContain("translate3d(");
  });
});

describe("ScrollProgress", () => {
  it("is hidden from screen readers, never takes pointer events, and starts empty", () => {
    const { getByTestId } = render(<ScrollProgress />);
    const el = getByTestId("scroll-progress");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("pointer-events-none");
    expect((el.firstChild as HTMLElement).style.transform).toBe("scaleX(0)");
  });
});
