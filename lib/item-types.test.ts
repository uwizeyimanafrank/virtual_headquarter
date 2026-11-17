import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY, inCases, inTour, normalizeDisplay } from "@/lib/item-types";

describe("display modes", () => {
  it("old or odd data counts as both", () => {
    for (const v of [undefined, null, "", "x", 3]) expect(normalizeDisplay(v)).toBe(DEFAULT_DISPLAY);
    expect(DEFAULT_DISPLAY).toBe("both");
  });
  it("tour, case and both decide which hall shows the item", () => {
    expect([inTour("tour"), inTour("case"), inTour("both")]).toEqual([true, false, true]);
    expect([inCases("tour"), inCases("case"), inCases("both")]).toEqual([false, true, true]);
  });
});
