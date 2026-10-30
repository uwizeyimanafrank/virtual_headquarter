import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CvCard } from "@/components/home/CvCard";
import { mockMedia } from "@/tests/media-query";

afterEach(() => vi.unstubAllGlobals());

function card() {
  render(<CvCard kicker="Kick" title="Card title"><p>body</p></CvCard>);
  const el = screen.getByRole("article");
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  return el;
}

describe("CvCard tilt", () => {
  it("leans toward the mouse on a desktop and resets when the mouse leaves", () => {
    mockMedia({ "hover: hover": true });
    const el = card();
    fireEvent.pointerMove(el, { clientX: 200, clientY: 50 });
    expect(el.style.transform).toContain("rotateY(7.00deg)");
    fireEvent.pointerLeave(el);
    expect(el.style.transform).toBe("");
  });

  it("never exceeds the maximum angle", () => {
    mockMedia({ "hover: hover": true });
    const el = card();
    fireEvent.pointerMove(el, { clientX: 5000, clientY: -5000 });
    expect(el.style.transform).toContain("rotateY(7.00deg)");
    expect(el.style.transform).toContain("rotateX(7.00deg)");
  });

  it("does not move when the visitor asked for reduced motion", () => {
    mockMedia({ "hover: hover": true, "prefers-reduced-motion": true });
    const el = card();
    fireEvent.pointerMove(el, { clientX: 200, clientY: 50 });
    expect(el.style.transform).toBe("");
  });

  it("does not tilt on touch devices (no mouse)", () => {
    mockMedia({});
    const el = card();
    fireEvent.pointerMove(el, { clientX: 200, clientY: 50 });
    expect(el.style.transform).toBe("");
  });

  it("shows its title and content", () => {
    mockMedia({});
    card();
    expect(screen.getByRole("heading", { name: "Card title" })).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});
