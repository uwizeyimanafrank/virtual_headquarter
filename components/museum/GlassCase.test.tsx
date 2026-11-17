import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GlassCase } from "@/components/museum/GlassCase";
import type { MuseumItemData } from "@/lib/museum";
import { mockMedia } from "@/tests/media-query";

afterEach(() => vi.unstubAllGlobals());

const item: MuseumItemData = { id: "x1", type: "certificate", title: "Web Development", date: "2025-06", description: "Completed the full course.", mediaUrl: "", parallaxSpeed: 0.5, skills: [], link: "", howIEarnedIt: "", isSample: false, display: "both", gallery: [], video: "", featured: false };

describe("GlassCase", () => {
  it("shows the label plate: type, date and title", () => {
    mockMedia({});
    render(<GlassCase item={item} onOpen={() => {}} />);
    expect(screen.getByText(/Certificate · 2025-06/)).toBeTruthy();
    expect(screen.getByText("Web Development")).toBeTruthy();
  });
  it("is one button that opens the panel with the item and the button that was used", () => {
    mockMedia({});
    const onOpen = vi.fn();
    render(<GlassCase item={item} onOpen={onOpen} />);
    const b = screen.getByRole("button");
    fireEvent.click(b);
    expect(onOpen).toHaveBeenCalledWith(item, b);
  });
  it("with a mouse the text appears on lean-closer; on touch it is always shown", () => {
    mockMedia({ "hover: hover": true });
    const { getByRole, unmount } = render(<GlassCase item={item} onOpen={() => {}} />);
    expect(getByRole("button").getAttribute("data-reveal")).toBe("hover");
    unmount();
    mockMedia({});
    expect(render(<GlassCase item={item} onOpen={() => {}} />).getByRole("button").getAttribute("data-reveal")).toBe("always");
  });
  it("spotlight and tilt only with a mouse and without reduced motion", () => {
    mockMedia({ "hover: hover": true, "pointer: fine": true });
    const a = render(<GlassCase item={item} onOpen={() => {}} />);
    expect(a.queryByTestId("spotlight")).not.toBeNull();
    a.unmount();
    mockMedia({ "hover: hover": true, "pointer: fine": true, "prefers-reduced-motion: reduce": true });
    const b = render(<GlassCase item={item} onOpen={() => {}} />);
    expect(b.queryByTestId("spotlight")).toBeNull();
    fireEvent.pointerMove(b.getByRole("button"), { clientX: 10, clientY: 10 });
    expect(b.getByRole("button").style.transform).toBe("");
  });
  it("hides the decorative picture from screen readers and copes with no picture", () => {
    mockMedia({});
    const { container } = render(<GlassCase item={{ ...item, mediaUrl: "/samples/certificate.svg" }} onOpen={() => {}} />);
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("");
    expect(render(<GlassCase item={item} onOpen={() => {}} />).container.querySelector("img")).toBeNull();
  });
});
