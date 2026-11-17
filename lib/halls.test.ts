import { describe, expect, it } from "vitest";
import { hallFromHash, hashForHall, nextHall } from "@/lib/halls";

describe("halls and the address bar", () => {
  it("#cases and a shared piece open the Glass Cases; everything else is the Story Tour", () => {
    expect(hallFromHash("#cases")).toBe("cases");
    expect(hallFromHash("#case=64f0")).toBe("cases");
    for (const h of ["", "#", "#tour", "#chapter-2", "#casesx"]) expect(hallFromHash(h)).toBe("tour");
  });
  it("round trips", () => {
    expect(hashForHall("cases")).toBe("#cases");
    expect(hashForHall("tour")).toBe("");
    expect(hallFromHash(hashForHall("cases"))).toBe("cases");
  });
  it("arrow keys wrap around, Home and End jump, other keys do nothing", () => {
    expect(nextHall("tour", "ArrowRight")).toBe("cases");
    expect(nextHall("cases", "ArrowRight")).toBe("tour");
    expect(nextHall("tour", "ArrowLeft")).toBe("cases");
    expect(nextHall("cases", "Home")).toBe("tour");
    expect(nextHall("tour", "End")).toBe("cases");
    expect(nextHall("tour", "Enter")).toBeNull();
  });
});

import { caseHash, caseIdFromHash, neighbour, panelImages } from "@/lib/halls";
describe("share links and panel helpers", () => {
  it("#case=<id> round trips, odd values give null", () => {
    expect(caseIdFromHash(caseHash("64f0a1"))).toBe("64f0a1");
    expect(caseIdFromHash(caseHash("a b/c"))).toBe("a b/c");
    for (const h of ["", "#cases", "#case=", "#case=%E0%A4%A"]) expect(caseIdFromHash(h)).toBeNull();
  });
  it("panel pictures: main first, then the gallery, no blanks or repeats", () => {
    expect(panelImages({ mediaUrl: "a", gallery: ["b", "a", "", "c"] })).toEqual(["a", "b", "c"]);
    expect(panelImages({ mediaUrl: "", gallery: [] })).toEqual([]);
  });
  it("previous and next wrap around; unknown id or a single piece gives null", () => {
    const xs = [{ id: "1" }, { id: "2" }, { id: "3" }];
    expect(neighbour(xs, "1", -1)?.id).toBe("3");
    expect(neighbour(xs, "3", 1)?.id).toBe("1");
    expect(neighbour(xs, "2", 1)?.id).toBe("3");
    expect(neighbour(xs, "9", 1)).toBeNull();
    expect(neighbour([{ id: "1" }], "1", 1)).toBeNull();
  });
});
