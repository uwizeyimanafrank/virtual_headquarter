import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { SlotHighlighter } from "@/components/site/SlotHighlighter";

let key: string | null = null;
vi.mock("next/navigation", () => ({ useSearchParams: () => ({ get: () => key }) }));
afterEach(() => { document.body.innerHTML = ""; vi.useRealTimers(); });

function page() {
  document.body.innerHTML = '<div data-slot="home.hero.bg" id="a"></div><div data-slot="museum.backdrop" id="b"></div>';
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
}

describe("SlotHighlighter", () => {
  it("outlines the named slot, labels it, and clears after a few seconds", () => {
    vi.useFakeTimers(); page(); key = "museum.backdrop";
    render(<SlotHighlighter />);
    const b = document.getElementById("b")!;
    expect(b.style.outline).toContain("3px solid");
    expect(b.textContent).toBe("museum.backdrop");
    expect(document.getElementById("a")!.style.outline).toBe("");
    act(() => { vi.advanceTimersByTime(6100); });
    expect(b.style.outline).toBe("");
    expect(b.textContent).toBe("");
  });
  it("does nothing without a key, or for a key that is not on the page", () => {
    page(); key = null;
    render(<SlotHighlighter />);
    expect(document.getElementById("a")!.style.outline).toBe("");
    key = "nope.nothing";
    render(<SlotHighlighter />);
    expect(document.body.textContent).toBe("");
  });
});
