import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { VerticalTimeline } from "@/components/museum/VerticalTimeline";
import type { Chapter } from "@/lib/museum-chapters";
import { mockMedia } from "@/tests/media-query";

const entry = (over: Partial<Chapter["entries"][number]> = {}) => ({ id: "1", type: "project", title: "Task Tracker", description: "A tracker for tasks.", mediaUrl: "", parallaxSpeed: 0.5, date: "2026-02", skills: ["Next.js"], link: "", howIEarnedIt: "Built it over a weekend.", ...over });
const chapters: Chapter[] = [
  { id: "projects", title: "The Execution", entries: [entry(), entry({ id: "2", title: "Shop Catalog", link: "https://example.org/shop", date: "2026-05" })] },
  { id: "certificates", title: "Proof", entries: [entry({ id: "3", type: "certificate", title: "Web Dev Cert", link: "javascript:alert(1)" })] },
];

// A tiny stand-in for the browser's IntersectionObserver that we can trigger by hand.
const observers: { cb: IntersectionObserverCallback }[] = [];
class FakeObserver { cb: IntersectionObserverCallback; constructor(cb: IntersectionObserverCallback) { this.cb = cb; observers.push(this); } observe() {} disconnect() {} unobserve() {} }

beforeEach(() => { observers.length = 0; vi.stubGlobal("IntersectionObserver", FakeObserver); mockMedia({}); });
afterEach(() => { vi.unstubAllGlobals(); document.body.style.overflow = ""; });

const cardButton = (title: string) => screen.getByRole("button", { name: new RegExp(title) });

describe("VerticalTimeline", () => {
  it("shows every chapter title and every item", () => {
    render(<VerticalTimeline chapters={chapters} />);
    expect(screen.getByRole("heading", { name: "The Execution" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Proof" })).toBeInTheDocument();
    for (const t of ["Task Tracker", "Shop Catalog", "Web Dev Cert"]) expect(cardButton(t)).toBeInTheDocument();
  });

  it("server-rendered HTML contains all the content and hides nothing (works without JavaScript)", () => {
    const html = renderToString(<VerticalTimeline chapters={chapters} />);
    expect(html).toContain("Task Tracker");
    expect(html).toContain("Web Dev Cert");
    expect(html).not.toContain("opacity-0");
  });

  it("items start hidden in the browser and appear one by one as they scroll into view", () => {
    render(<VerticalTimeline chapters={chapters} />);
    const items = screen.getAllByRole("listitem");
    expect(items.every((li) => li.className.includes("opacity-0"))).toBe(true);
    act(() => observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], observers[0] as unknown as IntersectionObserver));
    expect(items[0].className).toContain("opacity-100");
    expect(items[1].className).toContain("opacity-0"); // the next one is still waiting for its turn
  });

  it("with reduced motion nothing is hidden or delayed", () => {
    mockMedia({ "prefers-reduced-motion": true });
    render(<VerticalTimeline chapters={chapters} />);
    expect(screen.getAllByRole("listitem").every((li) => li.className.includes("opacity-100"))).toBe(true);
  });

  it("opens a pop-up with the story and closes with Escape, returning focus to the card", async () => {
    render(<VerticalTimeline chapters={chapters} />);
    const card = cardButton("Task Tracker");
    await userEvent.click(card);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("heading", { name: "Task Tracker" })).toBeInTheDocument();
    expect(within(dialog).getByText("Built it over a weekend.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it("locks page scrolling while open and restores it afterwards", async () => {
    document.body.style.overflow = "auto";
    render(<VerticalTimeline chapters={chapters} />);
    await userEvent.click(cardButton("Task Tracker"));
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).toBe("auto");
  });

  it("clicking the dark backdrop closes it, clicking inside does not", async () => {
    render(<VerticalTimeline chapters={chapters} />);
    await userEvent.click(cardButton("Task Tracker"));
    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps keyboard focus inside the pop-up (Tab and Shift+Tab wrap around)", async () => {
    render(<VerticalTimeline chapters={chapters} />);
    await userEvent.click(cardButton("Shop Catalog"));
    const close = screen.getByRole("button", { name: "Close" });
    const link = screen.getByRole("link", { name: /Open link/ });
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(link).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
  });

  it("shows the link only for real web addresses, and opens it safely", async () => {
    render(<VerticalTimeline chapters={chapters} />);
    await userEvent.click(cardButton("Shop Catalog"));
    const link = screen.getByRole("link", { name: /Open link/ });
    expect(link).toHaveAttribute("href", "https://example.org/shop");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(cardButton("Web Dev Cert")); // its link is javascript:..., which must never be shown
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders descriptions as plain text, never as HTML", async () => {
    render(<VerticalTimeline chapters={[{ id: "about", title: "About", entries: [entry({ title: "<img src=x onerror=alert(1)>", description: "<b>bold?</b>" })] }]} />);
    expect(document.querySelector("img[onerror]")).toBeNull();
    await userEvent.click(screen.getAllByRole("button")[0]);
    // The same text is in the card preview and in the pop-up; look inside the pop-up.
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("<b>bold?</b>")).toBeInTheDocument();
    expect(dialog.querySelector("b")).toBeNull();
  });
});
