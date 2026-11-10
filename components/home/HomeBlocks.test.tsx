import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { HomeBlocks } from "@/components/home/HomeBlocks";
import { resolveBlocks, visibleBlocks } from "@/lib/home-blocks";

const all = (order: string[]) => resolveBlocks(["hero", "stats", "hire"].map((key) => ({ key, enabled: true, order: order.indexOf(key) }))).filter((b) => order.includes(b.key));
const comps = { hero: () => <p>HERO</p>, hire: () => <p>HIRE</p> };

describe("HomeBlocks", () => {
  it("shows today only the hero (the others are not built, so they are hidden)", () => {
    const { container } = render(<HomeBlocks blocks={visibleBlocks(resolveBlocks(null))} components={comps} />);
    expect([...container.querySelectorAll("[data-block]")].map((e) => e.getAttribute("data-block"))).toEqual(["hero"]);
  });
  it("renders blocks in the owner's order, and skips a block that has no component yet", () => {
    const { container } = render(<HomeBlocks blocks={all(["hire", "stats", "hero"]).map((b) => ({ ...b, ready: true }))} components={comps} />);
    expect([...container.querySelectorAll("[data-block]")].map((e) => e.getAttribute("data-block"))).toEqual(["hire", "hero"]); // stats has no component
  });
  it("gives each block its own content", () => {
    const seen: string[] = [];
    render(<HomeBlocks blocks={visibleBlocks(resolveBlocks([{ key: "hero" }]))} components={{ hero: (b) => { seen.push(Object.keys(b.content).join(",")); return null; } }} />);
    expect(seen).toEqual([""]);
  });
});
