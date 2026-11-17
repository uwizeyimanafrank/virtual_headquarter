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
