import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Hero } from "@/components/home/Hero";
import type { HomeData } from "@/lib/home";

const getSlot = vi.fn();
let floatProps: { xRange?: readonly [number, number]; count?: number } = {};
vi.mock("@/lib/slots", () => ({ getSlot: (k: string) => getSlot(k) }));
vi.mock("@/components/art/SceneImage", () => ({ SceneImage: ({ slot }: { slot: string }) => <div data-testid={`slot-${slot}`} /> }));
vi.mock("@/components/art/FloatingField", () => ({ FloatingField: (p: typeof floatProps) => { floatProps = p; return <div data-testid="floating" />; } }));

const data = (over: Partial<HomeData> = {}): HomeData => ({
  heroTitle: "Discipline over luck.", heroText: "Vision sets the direction.", chapterTitles: { about: "a", certificates: "b", projects: "c", library: "d" },
  profile: { name: "Frank", tagline: "Builder", bio: "", photoUrl: "" }, items: [], blocks: [], ...over,
});
const show = async (d = data(), options: Record<string, string> = {}) => render(await Hero({ data: d, options }));
const charBox = (c: HTMLElement) => c.querySelector('[data-testid="slot-home.hero.character"]')!.parentElement as HTMLElement;

beforeEach(() => { getSlot.mockReset().mockResolvedValue({ custom: false }); floatProps = {}; });

describe("Hero", () => {
  it("shows the owner's words, profile and a way into the Museum", async () => {
    const { getByRole, getByText } = await show();
    expect(getByRole("heading", { level: 1 })).toHaveTextContent("Discipline over luck.");
    expect(getByText("Vision sets the direction.")).toBeInTheDocument();
    expect(getByText("Frank")).toBeInTheDocument();
    expect(getByText("Builder")).toBeInTheDocument();
    expect(getByRole("link", { name: /Enter the Museum/ })).toHaveAttribute("href", "/museum");
  });
  it("does not offer Hire me until the Hire page exists", async () => {
    const { queryByRole } = await show();
    expect(queryByRole("link", { name: "Hire me" })).toBeNull();
  });
  it("draws the background and the character from image slots, so the Office can replace both", async () => {
    const { getByTestId } = await show();
    expect(getByTestId("slot-home.hero.bg")).toBeInTheDocument();
    expect(getByTestId("slot-home.hero.character")).toBeInTheDocument();
    expect(getByTestId("floating")).toBeInTheDocument();
  });
  it("puts the character on the right by default and keeps the floating items away from the text", async () => {
    const { container } = await show();
    expect(charBox(container).className).toContain("lg:right-0");
    expect(floatProps.xRange).toEqual([46, 96]);
  });
  it("can put the character on the left, and then the text moves to the right", async () => {
    const { container } = await show(data(), { side: "left" });
    expect(charBox(container).className).toContain("lg:left-0");
    expect(floatProps.xRange).toEqual([4, 54]);
    expect(container.innerHTML).toContain("lg:items-end");
  });
  it("falls back to the right for a side it does not know", async () => {
    const { container } = await show(data(), { side: "diagonal" });
    expect(charBox(container).className).toContain("lg:right-0");
  });
  it("fades the character with a mask chosen in code", async () => {
    const { container } = await show();
    expect(charBox(container).style.getPropertyValue("--hero-mask")).toContain("linear-gradient");
  });
  it("leaves our drawn scene alone: no mood filter, tint or grain", async () => {
    const { container } = await show();
    expect(charBox(container).style.filter).toBe("");
    expect(container.querySelector("feTurbulence")).toBeNull();
  });
  it("gives the owner's own photo the mood: darkening, teal tint, film grain", async () => {
    getSlot.mockResolvedValue({ custom: true });
    const { container } = await show();
    expect(charBox(container).style.filter).toContain("brightness(");
    expect(container.querySelector(".mix-blend-color")).not.toBeNull();
    expect(container.querySelector("feTurbulence")).not.toBeNull();
  });
  it("uses the owner's mood numbers, and draws no grain when it is 0", async () => {
    getSlot.mockResolvedValue({ custom: true });
    const { container } = await show(data(), { darken: "100", grain: "0" });
    expect(charBox(container).style.filter).toContain("brightness(0.5");
    expect(container.querySelector("feTurbulence")).toBeNull();
  });
  it("copes with no profile at all", async () => {
    const { queryByText } = await show(data({ profile: { name: "", tagline: "", bio: "", photoUrl: "" } }));
    expect(queryByText("Frank")).toBeNull();
  });
});
