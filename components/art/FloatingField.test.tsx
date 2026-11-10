import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { FloatingField } from "@/components/art/FloatingField";

let reduced = false;
let ioCallback: IntersectionObserverCallback | null = null;
beforeEach(() => {
  reduced = false; ioCallback = null;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  window.matchMedia = ((q: string) => ({ matches: q.includes("reduce") ? reduced : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { constructor(cb: IntersectionObserverCallback) { ioCallback = cb; } observe() {} disconnect() {} unobserve() {} takeRecords() { return []; } };
});

const field = (c: HTMLElement) => c.firstChild as HTMLElement;

describe("FloatingField", () => {
  it("is decorative and never blocks clicks", () => {
    const { container } = render(<FloatingField />);
    expect(field(container).getAttribute("aria-hidden")).toBe("true");
    expect(field(container).className).toContain("pointer-events-none");
  });
  it("places the items after it loads (server and browser can never disagree)", () => {
    const { container } = render(<FloatingField count={10} />);
    expect(container.querySelectorAll(".ff-item")).toHaveLength(10);
  });
  it("never shows more than 16, even if asked", () => {
    const { container } = render(<FloatingField count={99} />);
    expect(container.querySelectorAll(".ff-item")).toHaveLength(16);
  });
  it("shows fewer on a phone", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { container } = render(<FloatingField count={16} />);
    expect(container.querySelectorAll(".ff-item")).toHaveLength(8);
  });
  it("draws icons as SVG and owner emoji as text", () => {
    const { container } = render(<FloatingField items={["code", "🌙"]} count={12} />);
    expect(container.querySelector("svg path")).not.toBeNull();
    expect(container.textContent).toContain("🌙");
  });
  it("renders nothing when there is nothing valid to show", () => {
    const { container } = render(<FloatingField items={["nonsense text that is too long"]} />);
    expect(container.querySelectorAll(".ff-item")).toHaveLength(0);
  });
  it("moves normally, and stays still with reduced motion (items stay, nothing animates, no observers)", () => {
    const a = render(<FloatingField />);
    expect(field(a.container).dataset.motion).toBe("on");
    reduced = true; ioCallback = null;
    const b = render(<FloatingField />);
    expect(field(b.container).dataset.motion).toBe("off");
    expect(b.container.querySelectorAll(".ff-item").length).toBeGreaterThan(0);
    expect(ioCallback).toBeNull();
  });
  it("pauses off screen and when the tab is hidden", () => {
    const { container } = render(<FloatingField />);
    act(() => ioCallback!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(field(container).dataset.paused).toBe("true");
    act(() => ioCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(field(container).dataset.paused).toBe("false");
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(field(container).dataset.paused).toBe("true");
  });
  it("gives each item its own drift, size and brightness", () => {
    const { container } = render(<FloatingField count={6} />);
    const spans = Array.from(container.querySelectorAll<HTMLElement>(".ff-item"));
    for (const s of spans) { expect(s.style.getPropertyValue("--dx")).toMatch(/px$/); expect(s.style.getPropertyValue("--dur")).toMatch(/s$/); expect(parseFloat(s.style.opacity)).toBeLessThan(0.7); }
    expect(new Set(spans.map((s) => s.style.left)).size).toBeGreaterThan(3);
  });
  it("cleans up when it goes away", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<FloatingField />);
    unmount();
    expect(remove.mock.calls.some((c) => c[0] === "visibilitychange")).toBe(true);
    remove.mockRestore();
  });
});
