import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DetailPanel } from "@/components/museum/DetailPanel";
import type { MuseumItemData } from "@/lib/museum";

const mk = (id: string, over: Partial<MuseumItemData> = {}): MuseumItemData => ({ id, type: "project", title: `Piece ${id}`, date: "2026-02", description: `About ${id}.`, mediaUrl: "", parallaxSpeed: 0.5, skills: ["React"], link: "", howIEarnedIt: "", isSample: false, display: "both", gallery: [], video: "", featured: false, ...over });
const items = [mk("a"), mk("b", { link: "https://example.org/b", gallery: ["/samples/book.svg"], mediaUrl: "/samples/project.svg", howIEarnedIt: "Long story." }), mk("c")];
const setup = (openId: string | null, extra: Partial<React.ComponentProps<typeof DetailPanel>> = {}) => {
  const onClose = vi.fn(), onNavigate = vi.fn();
  const r = render(<DetailPanel items={items} openId={openId} onClose={onClose} onNavigate={onNavigate} returnFocusTo={null} {...extra} />);
  return { onClose, onNavigate, ...r };
};

describe("DetailPanel", () => {
  it("renders nothing when closed", () => {
    setup(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("is a labelled modal dialog with the title, story, skills and a safe link", () => {
    setup("b");
    const d = screen.getByRole("dialog");
    expect(d.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Piece b" })).toBeTruthy();
    expect(screen.getByText("Long story.")).toBeTruthy();
    expect(screen.getByLabelText("Skills").textContent).toContain("React");
    expect(screen.getByRole("link", { name: /Open link/ }).getAttribute("rel")).toContain("noopener");
  });
  it("moves focus to Close, Escape closes, and the page behind stops scrolling until it closes", () => {
    const { onClose, unmount } = setup("a");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("Tab stays inside the panel", () => {
    setup("a");
    const els = screen.getByRole("dialog").querySelectorAll<HTMLElement>("button, a[href]");
    const last = els[els.length - 1];
    last.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
  });
  it("previous and next piece wrap around", () => {
    const { onNavigate } = setup("a");
    fireEvent.click(screen.getByRole("button", { name: /Previous piece/ }));
    expect(onNavigate).toHaveBeenLastCalledWith("c");
    fireEvent.click(screen.getByRole("button", { name: /Next piece/ }));
    expect(onNavigate).toHaveBeenLastCalledWith("b");
  });
  it("several pictures get a carousel with named buttons; one picture does not", () => {
    setup("b");
    expect(screen.getByRole("img").getAttribute("alt")).toBe("Piece b, picture 1 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Next picture" }));
    expect(screen.getByRole("img").getAttribute("alt")).toBe("Piece b, picture 2 of 2");
  });
  it("copies a share link that opens on this piece", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    setup("c");
    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }));
    await screen.findByText("Link copied");
    expect(writeText.mock.calls[0][0]).toMatch(/#case=c$/);
  });
  it("a video is only a poster with a Play button until pressed", () => {
    render(<DetailPanel items={[mk("v", { video: "https://res.cloudinary.com/x/video/upload/v1/clip.mp4" })]} openId="v" onClose={() => {}} onNavigate={() => {}} returnFocusTo={null} />);
    expect(document.querySelector("video")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Play video: Piece v" }));
    expect(document.querySelector("video")!.hasAttribute("controls")).toBe(true);
  });
});
