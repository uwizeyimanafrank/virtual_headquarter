import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import { CardWall } from "@/components/home/CardWall";
import type { HomeItem } from "@/lib/home";

const item = (n: number, over: Partial<HomeItem> = {}): HomeItem => ({ id: `item-${n}`, type: "project", title: `Project ${n}`, date: "2026-01", description: `Built thing ${n}. More.`, mediaUrl: `https://res.cloudinary.com/demo/image/upload/v1/p${n}.jpg`, skills: [], link: "", ...over });
const content = { title: "Wander around", intro: "Pick a card." };
const cards = (c: HTMLElement) => c.querySelector("ul.wall")!;

describe("CardWall", () => {
  it("shows the owner's heading and intro", () => {
    const { getByRole, getByText } = render(<CardWall items={[]} content={content} />);
    expect(getByRole("heading", { level: 2 })).toHaveTextContent("Wander around");
    expect(getByText("Pick a card.")).toBeInTheDocument();
  });
  it("is never empty: without items it still shows 12 sample cards", () => {
    const { container } = render(<CardWall items={[]} content={content} />);
    expect(within(cards(container) as HTMLElement).getAllByRole("link")).toHaveLength(12);
    expect(container.textContent).toContain("Sample");
  });
  it("turns items into cards that link to their case in the Museum", () => {
    const { container } = render(<CardWall items={[item(1), item(2)]} content={content} />);
    const links = within(cards(container) as HTMLElement).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/museum#case=item-1");
    expect(links[0]).toHaveTextContent("Project 1");
    expect(links[0]).toHaveTextContent("Built thing 1.");
    expect(links[0]).toHaveTextContent("Project"); // the tag
  });
  it("tilts and lifts each card with its own values, and gives each a glow", () => {
    const { container } = render(<CardWall items={[item(1), item(2), item(3)]} content={content} />);
    const lis = [...cards(container).querySelectorAll<HTMLElement>("li.wall-card")];
    expect(lis.length).toBeGreaterThanOrEqual(12);
    for (const li of lis) { expect(li.style.getPropertyValue("--rot")).toMatch(/deg$/); expect(li.style.getPropertyValue("--lift")).toMatch(/px$/); expect(li.style.getPropertyValue("--glow")).toContain("rgba"); }
    expect(new Set(lis.map((l) => l.style.getPropertyValue("--rot"))).size).toBeGreaterThan(3);
  });
  it("loads pictures lazily and treats them as decoration (the text carries the meaning)", () => {
    const { container } = render(<CardWall items={[item(1)]} content={content} />);
    for (const img of cards(container).querySelectorAll("img")) { expect(img.getAttribute("loading")).toBe("lazy"); expect(img.getAttribute("alt")).toBe(""); }
  });
  it("has two decorative picture strips, each doubled so the loop has no gap", () => {
    const { container } = render(<CardWall items={[]} content={content} />);
    const strips = container.querySelectorAll(".strip");
    expect(strips).toHaveLength(2);
    expect([...strips].map((s) => s.getAttribute("data-dir"))).toEqual(["left", "right"]);
    for (const s of strips) { expect(s.getAttribute("aria-hidden")).toBe("true"); expect(s.querySelectorAll("img").length % 2).toBe(0); expect(s.querySelectorAll("img").length).toBeGreaterThanOrEqual(8); }
  });
  it("does not mark the owner's real items as samples", () => {
    const { container } = render(<CardWall items={Array.from({ length: 12 }, (_, i) => item(i))} content={content} />);
    const real = [...cards(container).querySelectorAll("li")].filter((li) => li.textContent?.includes("Project"));
    expect(real.length).toBeGreaterThan(5);
    expect(real.every((li) => !li.textContent?.includes("Sample"))).toBe(true);
  });
});
