import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { Scene, pointerOffset, scrollOffset } from "@/components/art/Scene";
import { ART_SVG } from "@/lib/art-data.generated";

let reduced = false;
let fine = true;
let ioCallback: IntersectionObserverCallback | null = null;
const disconnect = vi.fn();

beforeEach(() => {
  reduced = false; fine = true; ioCallback = null; disconnect.mockClear();
  window.matchMedia = ((q: string) => ({ matches: q.includes("reduce") ? reduced : q.includes("hover") ? fine : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { constructor(cb: IntersectionObserverCallback) { ioCallback = cb; } observe() {} disconnect() { disconnect(); } unobserve() {} takeRecords() { return []; } };
});
afterEach(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); });

const svg = ART_SVG["/art/hoodie-shore-sunset.svg"];
const root = (c: HTMLElement) => c.firstChild as HTMLElement;

describe("pure helpers", () => {
  it("pointerOffset maps a box to -1..1 and stays inside", () => {
    const box = { left: 100, top: 100, width: 200, height: 100 };
    expect(pointerOffset(200, 150, box)).toEqual({ x: 0, y: 0 });
    expect(pointerOffset(100, 100, box)).toEqual({ x: -1, y: -1 });
    expect(pointerOffset(900, 900, box)).toEqual({ x: 1, y: 1 });
    expect(pointerOffset(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
  it("scrollOffset is 0 when centred and has opposite signs above and below", () => {
    expect(scrollOffset({ top: 400, height: 200 }, 1000)).toBeCloseTo(0);
    expect(scrollOffset({ top: -300, height: 200 }, 1000)).toBeGreaterThan(0);
    expect(scrollOffset({ top: 900, height: 200 }, 1000)).toBeLessThan(0);
    expect(scrollOffset({ top: 0, height: 10 }, 0)).toBe(0);
  });
});

describe("Scene", () => {
  it("inlines the drawn scene with its named layers, hidden from screen readers", () => {
    const { container } = render(<Scene svg={svg} />);
    expect(root(container).getAttribute("aria-hidden")).toBe("true");
    for (const id of ["sky", "sun", "clouds", "water", "figure"]) expect(container.querySelector(`[id="${id}"]`), id).not.toBeNull();
  });
  it("turns motion and parallax on for a normal visitor", () => {
    const { container } = render(<Scene svg={svg} />);
    expect(root(container).dataset.motion).toBe("on");
    expect(root(container).dataset.parallax).toBe("on");
    expect(root(container).dataset.paused).toBe("false");
  });
  it("stays completely still for reduced motion: no motion, no parallax, no listeners", () => {
    reduced = true;
    const add = vi.spyOn(window, "addEventListener");
    const { container } = render(<Scene svg={svg} />);
    expect(root(container).dataset.motion).toBe("off");
    expect(root(container).dataset.parallax).toBe("off");
    expect(ioCallback).toBeNull();
    expect(add.mock.calls.some((c) => c[0] === "scroll")).toBe(false);
    add.mockRestore();
  });
  it("can be switched off by the page", () => {
    const { container } = render(<Scene svg={svg} animate={false} parallax={false} />);
    expect(root(container).dataset.motion).toBe("off");
    expect(root(container).dataset.parallax).toBe("off");
  });
  it("pauses when off screen and when the tab is hidden, and resumes", () => {
    const { container } = render(<Scene svg={svg} />);
    const r = root(container);
    act(() => ioCallback!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(r.dataset.paused).toBe("true");
    act(() => ioCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(r.dataset.paused).toBe("false");
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(r.dataset.paused).toBe("true");
  });
  it("follows the mouse only when there is a real mouse, and resets on leave", () => {
    const { container } = render(<Scene svg={svg} />);
    const r = root(container);
    r.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} });
    fireEvent.pointerMove(r, { clientX: 200, clientY: 50 });
    expect(r.style.getPropertyValue("--px")).toBe("1.000");
    fireEvent.pointerLeave(r);
    expect(r.style.getPropertyValue("--px")).toBe("0");
  });
  it("ignores the mouse on touch screens", () => {
    fine = false;
    const { container } = render(<Scene svg={svg} />);
    const r = root(container);
    fireEvent.pointerMove(r, { clientX: 100, clientY: 50 });
    expect(r.style.getPropertyValue("--px")).toBe("");
  });
  it("cleans up when it goes away", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Scene svg={svg} />);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(remove.mock.calls.some((c) => c[0] === "scroll")).toBe(true);
    remove.mockRestore();
  });
});
