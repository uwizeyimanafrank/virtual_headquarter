import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HallSwitcher } from "@/components/museum/HallSwitcher";

describe("HallSwitcher", () => {
  it("is a tab list with both doors, the current one selected and the only one in the tab order", () => {
    render(<HallSwitcher hall="tour" onChange={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Museum halls" })).toBeTruthy();
    const tour = screen.getByRole("tab", { name: "Story Tour" });
    const cases = screen.getByRole("tab", { name: "Glass Cases" });
    expect(tour.getAttribute("aria-selected")).toBe("true");
    expect(cases.getAttribute("aria-selected")).toBe("false");
    expect(tour.getAttribute("tabindex")).toBe("0");
    expect(cases.getAttribute("tabindex")).toBe("-1");
  });
  it("clicking a door reports it", () => {
    const onChange = vi.fn();
    render(<HallSwitcher hall="tour" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Glass Cases" }));
    expect(onChange).toHaveBeenCalledWith("cases");
  });
  it("arrow keys move between the doors and focus follows", () => {
    const onChange = vi.fn();
    render(<HallSwitcher hall="tour" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Story Tour" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("cases");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Glass Cases" }));
  });
});
