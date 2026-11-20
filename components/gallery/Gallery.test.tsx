import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { GalleryWall } from "@/components/gallery/GalleryWall";
import type { GalleryChapter, PublicPhoto } from "@/lib/gallery";

const photo = (n: number, over: Partial<PublicPhoto> = {}): PublicPhoto => ({ id: `p${n}`, src: `/s${n}.jpg`, full: `/f${n}.jpg`, blur: n % 2 ? `/b${n}.jpg` : "", caption: `Caption ${n}`, alt: `Alt ${n}`, takenDate: "", ...over });
const albums: GalleryChapter[] = [
  { id: "a1", title: "Kigali", description: "Home town", photos: [photo(1), photo(2), photo(3)] },
  { id: "", title: "", description: "", photos: [photo(4)] },
];
const viewerImg = () => document.querySelector("[role=dialog] img") as HTMLImageElement;
const counter = () => screen.getByText(/^Picture \d+ of \d+$/).textContent;

describe("GalleryWall", () => {
  it("shows albums as chapters, with a jump link each, and the rest under 'More pictures'", () => {
    render(<GalleryWall chapters={albums} />);
    expect(screen.getByRole("heading", { name: "Kigali" })).toBeTruthy();
    expect(screen.getByText("Home town")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "More pictures" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Albums" });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["#album-a1", "#album-more"]);
  });
  it("with no albums, shows just the pictures: no headings and no jump links", () => {
    render(<GalleryWall chapters={[{ id: "", title: "", description: "", photos: [photo(1), photo(2)] }]} />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
  it("lazy-loads every picture with its alt text and a blurred placeholder behind it", () => {
    const { container } = render(<GalleryWall chapters={albums} />);
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs).toHaveLength(4);
    for (const i of imgs) { expect(i.getAttribute("loading")).toBe("lazy"); expect(i.getAttribute("decoding")).toBe("async"); expect(i.alt).toMatch(/^Alt \d$/); }
    expect((imgs[0].parentElement as HTMLElement).style.backgroundImage).toContain("/b1.jpg");
    expect((imgs[0].parentElement as HTMLElement).style.aspectRatio).toBeTruthy(); // space reserved before it loads: no jumping
  });
  it("tilts each polaroid by a steady amount", () => {
    const { container } = render(<GalleryWall chapters={albums} />);
    for (const li of container.querySelectorAll("li")) expect(li.getAttribute("style")).toMatch(/--tilt: -?\d/);
  });
});

describe("Lightbox (keyboard)", () => {
  it("opens on Enter/click, shows the big picture, caption and position", () => {
    render(<GalleryWall chapters={albums} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Alt 2/ })[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(viewerImg().getAttribute("src")).toBe("/f2.jpg"); // the large size, not the wall size
    expect(viewerImg().alt).toBe("Alt 2");
    expect(counter()).toBe("Picture 2 of 4");
    expect(within(screen.getByRole("dialog")).getByText("Caption 2")).toBeTruthy();
  });
  it("moves with ArrowRight / ArrowLeft, wraps around, and jumps with Home / End", () => {
    render(<GalleryWall chapters={albums} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Alt 1/ })[0]);
    const press = (key: string) => fireEvent.keyDown(screen.getByRole("dialog"), { key });
    press("ArrowRight"); expect(counter()).toBe("Picture 2 of 4");
    press("ArrowLeft"); press("ArrowLeft"); expect(counter()).toBe("Picture 4 of 4"); // wrapped from the first to the last
    press("ArrowRight"); expect(counter()).toBe("Picture 1 of 4");
    press("End"); expect(counter()).toBe("Picture 4 of 4");
    press("Home"); expect(counter()).toBe("Picture 1 of 4");
  });
  it("closes on Escape and on the Close button, and gives focus back to the picture you opened", () => {
    render(<GalleryWall chapters={albums} />);
    const opener = screen.getAllByRole("button", { name: /Alt 3/ })[0];
    opener.focus();
    fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("keeps Tab inside the viewer and stops the page behind from scrolling", () => {
    render(<GalleryWall chapters={albums} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Alt 1/ })[0]);
    expect(document.body.style.overflow).toBe("hidden");
    const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });
  it("has working Previous and Next buttons", () => {
    render(<GalleryWall chapters={albums} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Alt 1/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Next picture" }));
    expect(counter()).toBe("Picture 2 of 4");
    fireEvent.click(screen.getByRole("button", { name: "Previous picture" }));
    expect(counter()).toBe("Picture 1 of 4");
  });
});

describe("Lightbox (touch)", () => {
  const swipe = (dx: number, dy = 0) => {
    const d = screen.getByRole("dialog");
    fireEvent.touchStart(d, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(d, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] });
  };
  it("swipe left shows the next picture, swipe right the previous one", () => {
    render(<GalleryWall chapters={albums} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Alt 2/ })[0]);
    swipe(-120); expect(counter()).toBe("Picture 3 of 4");
    swipe(120); swipe(120); expect(counter()).toBe("Picture 1 of 4");
  });
  it("ignores taps, tiny movements and mostly-vertical drags", () => {
    render(<GalleryWall chapters={albums} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Alt 2/ })[0]);
    swipe(0); swipe(-30); swipe(-80, 200);
    expect(counter()).toBe("Picture 2 of 4");
  });
});
