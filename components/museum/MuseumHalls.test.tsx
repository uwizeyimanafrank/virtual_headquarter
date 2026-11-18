import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MuseumHalls } from "@/components/museum/MuseumHalls";
import type { MuseumChapter, MuseumItemData } from "@/lib/museum";
import { mockMedia } from "@/tests/media-query";

const mk = (id: string, o: Partial<MuseumItemData> = {}): MuseumItemData => ({ id, type: "project", title: `Title ${id}`, date: "2026-01", description: `About ${id}`, mediaUrl: "", parallaxSpeed: 0.5, skills: [], link: "", howIEarnedIt: "", isSample: false, display: "both", gallery: [], video: "", featured: false, ...o });
const chapters: MuseumChapter[] = [{ key: "projects", title: "Work", items: [mk("p1"), mk("p2", { display: "case" }), mk("p3", { display: "tour" })] }];

beforeEach(() => { mockMedia({}); window.history.replaceState(null, "", "/museum"); });
afterEach(() => vi.unstubAllGlobals());

describe("MuseumHalls", () => {
  it("starts in the Story Tour and the address stays plain", () => {
    render(<MuseumHalls chapters={chapters} />);
    expect(screen.getByRole("tab", { name: "Story Tour" }).getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("");
  });
  it("the Glass Cases door switches hall without a reload and writes #cases; the Story Tour door clears it", () => {
    render(<MuseumHalls chapters={chapters} />);
    fireEvent.click(screen.getByRole("tab", { name: "Glass Cases" }));
    expect(window.location.hash).toBe("#cases");
    expect(screen.getByRole("tabpanel").id).toBe("hall-panel-cases");
    expect(screen.getByRole("button", { name: /Title p2/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Title p3/ })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Story Tour" }));
    expect(window.location.hash).toBe("");
  });
  it("opens straight on a shared piece (#case=id) in the Glass Cases", () => {
    window.history.replaceState(null, "", "/museum#case=p2");
    render(<MuseumHalls chapters={chapters} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Title p2" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Glass Cases" }).getAttribute("aria-selected")).toBe("true");
  });
  it("a link to a piece that does not exist just opens the cases", () => {
    window.history.replaceState(null, "", "/museum#case=nope");
    render(<MuseumHalls chapters={chapters} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tab", { name: "Glass Cases" }).getAttribute("aria-selected")).toBe("true");
  });
  it("opening a case puts #case=id in the address; closing goes back to #cases", () => {
    window.history.replaceState(null, "", "/museum#cases");
    render(<MuseumHalls chapters={chapters} />);
    fireEvent.click(screen.getByRole("button", { name: /Title p1/ }));
    expect(window.location.hash).toBe("#case=p1");
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => { fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" }); });
    expect(window.location.hash).toBe("#cases");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
