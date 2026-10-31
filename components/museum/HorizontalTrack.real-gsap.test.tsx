import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MuseumClient } from "@/components/museum/MuseumClient";
import type { MuseumChapter } from "@/lib/museum";
import { createMedia } from "@/tests/media-query";

// These tests use the REAL GSAP (no fake) in the simulated browser. jsdom cannot show animation, but
// it can show what GSAP does to the page structure: pinning wraps the section in a "pin-spacer"
// element, which used to make React fail with "node to be removed is not a child" when the Museum
// was removed (for example when the window is resized below 768px).
const chapters: MuseumChapter[] = [
  { key: "projects", title: "Work", items: [{ id: "b", type: "project", title: "Piece b", date: "2026-02", description: "x", mediaUrl: "", parallaxSpeed: 0.5, skills: [], link: "", howIEarnedIt: "", isSample: false }] },
];

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => 3000 });
  window.innerWidth = 1000;
});
afterEach(() => { vi.unstubAllGlobals(); delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth; });

describe("HorizontalTrack with the real GSAP", () => {
  it("pins the section, and removing it afterwards does not break React or leave GSAP leftovers", async () => {
    createMedia({ "min-width": true });
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.error);
    window.addEventListener("error", onError);

    const { unmount } = render(<MuseumClient chapters={chapters} />);
    await screen.findByTestId("horizontal-museum");
    await waitFor(() => expect(document.querySelector(".pin-spacer")).not.toBeNull()); // GSAP really pinned it

    expect(() => unmount()).not.toThrow();
    expect(document.querySelector(".pin-spacer")).toBeNull();
    expect(document.body.querySelector("[data-testid='horizontal-museum']")).toBeNull();
    window.removeEventListener("error", onError);
    expect(errors).toHaveLength(0);
  });

  it("resizing below 768px swaps to the vertical timeline cleanly", async () => {
    const media = createMedia({ "min-width": true });
    render(<MuseumClient chapters={chapters} />);
    await waitFor(() => expect(document.querySelector(".pin-spacer")).not.toBeNull());
    expect(() => media.set({ "min-width": false })).not.toThrow();
    expect(document.querySelector(".pin-spacer")).toBeNull();
    expect(screen.getByRole("heading", { name: "Work" })).toBeInTheDocument();
  });
});
