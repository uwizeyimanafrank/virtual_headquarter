import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Stats } from "@/components/home/Stats";
import { WhatIBuild } from "@/components/home/WhatIBuild";
import { Journey } from "@/components/home/Journey";
import type { HomeItem } from "@/lib/home";

vi.mock("@/components/art/SceneImage", () => ({ SceneImage: ({ slot }: { slot: string }) => <div data-testid="scene" data-slot-name={slot} /> }));

const item = (o: Partial<HomeItem>): HomeItem => ({ id: "a", type: "project", title: "Shop", date: "2025-01", description: "Built a shop.", mediaUrl: "https://x/y.jpg", skills: [], link: "", ...o });

describe("Stats", () => {
  it("shows the owner's numbers with their labels", () => {
    const { getByText } = render(<Stats content={{ title: "At a glance", stat1Value: "2", stat1Label: "Internships" }} />);
    expect(getByText("Internships")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
  });
  it("renders nothing when no stat is filled in", () => {
    expect(render(<Stats content={{ title: "x" }} />).container.innerHTML).toBe("");
  });
});

describe("WhatIBuild", () => {
  it("shows a card per filled title with its text", () => {
    const { getAllByRole, getByText } = render(<WhatIBuild content={{ title: "What I build", card1Title: "A", card1Text: "aa", card2Title: "B", card2Text: "bb" }} />);
    expect(getAllByRole("listitem").length).toBe(2);
    expect(getByText("bb")).toBeTruthy();
  });
  it("renders nothing without cards", () => expect(render(<WhatIBuild content={{ title: "x" }} />).container.innerHTML).toBe(""));
});

describe("Journey", () => {
  it("puts the journey backdrop slot behind the timeline, hidden from screen readers, in time order", () => {
    const { getByTestId, container, getAllByRole } = render(<Journey items={[item({ id: "2", date: "2026-01", title: "Later" }), item({ id: "1", date: "2024-01", title: "Earlier" })]} content={{ title: "Journey", intro: "" }} />);
    expect(getByTestId("scene").getAttribute("data-slot-name")).toBe("home.journey.bg");
    expect(container.querySelector("[data-backdrop]")!.getAttribute("aria-hidden")).toBe("true");
    expect(getAllByRole("listitem").map((li) => li.querySelector("h3")!.textContent)).toEqual(["Earlier", "Later"]);
    expect(container.textContent).not.toContain("Sample");
  });
  it("shows marked sample steps when the owner has no items", () => {
    const { container, getAllByRole } = render(<Journey items={[]} content={{ title: "Journey", intro: "" }} />);
    expect(getAllByRole("listitem").length).toBe(3);
    expect(container.textContent).toContain("Sample");
  });
});

import { FeaturedWork } from "@/components/home/FeaturedWork";
describe("FeaturedWork", () => {
  const p = item({ id: "f", featured: true, problem: "Slow shop", whatIDid: "Rebuilt it", result: "3x faster", skills: ["Next.js"], link: "https://x.dev" });
  it("shows problem, action, result, chips and a safe live link", () => {
    const { getByText, container } = render(<FeaturedWork items={[p]} content={{ title: "Selected work", intro: "" }} />);
    for (const t of ["Slow shop", "Rebuilt it", "3x faster", "Next.js"]) expect(getByText(t)).toBeTruthy();
    const a = container.querySelector("a")!;
    expect(a.getAttribute("rel")).toContain("noopener");
  });
  it("renders nothing when no project is featured", () => expect(render(<FeaturedWork items={[item({})]} content={{ title: "x" }} />).container.innerHTML).toBe(""));
});
