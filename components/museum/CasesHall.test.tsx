import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CasesHall } from "@/components/museum/CasesHall";
import type { MuseumItemData } from "@/lib/museum";
import { mockMedia } from "@/tests/media-query";

afterEach(() => vi.unstubAllGlobals());
const mk = (id: string, o: Partial<MuseumItemData> = {}): MuseumItemData => ({ id, type: "project", title: `Title ${id}`, date: "2026-01", description: "", mediaUrl: "", parallaxSpeed: 0.5, skills: [], link: "", howIEarnedIt: "", isSample: false, display: "both", gallery: [], video: "", featured: false, ...o });
const items = [mk("a"), mk("b", { type: "book", title: "Reading list" }), mk("c", { type: "certificate", title: "Diploma", skills: ["Networking"] })];

describe("CasesHall", () => {
  it("shows a case per piece and chips only for kinds that exist", () => {
    mockMedia({});
    render(<CasesHall items={items} onOpen={() => {}} />);
    expect(screen.getAllByRole("button", { name: /Title a|Reading list|Diploma/ }).length).toBe(3);
    expect(screen.getByRole("button", { name: "Books" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "References" })).toBeNull();
  });
  it("a chip filters, and says which one is pressed", () => {
    mockMedia({});
    render(<CasesHall items={items} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Books" }));
    expect(screen.getByRole("button", { name: "Books" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Diploma")).toBeNull();
    expect(screen.getByText("Reading list")).toBeTruthy();
  });
  it("search narrows the cases and announces the count; no match shows a friendly message", () => {
    mockMedia({});
    render(<CasesHall items={items} onOpen={() => {}} />);
    fireEvent.change(screen.getByLabelText("Search the cases"), { target: { value: "networking" } });
    expect(screen.getByText("Diploma")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("1 piece shown");
    fireEvent.change(screen.getByLabelText("Search the cases"), { target: { value: "zzz" } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });
  it("opening a case reports the piece", () => {
    mockMedia({});
    const onOpen = vi.fn();
    render(<CasesHall items={items} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /Diploma/ }));
    expect(onOpen.mock.calls[0][0].id).toBe("c");
  });
});
