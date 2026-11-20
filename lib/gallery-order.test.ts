import { describe, expect, it } from "vitest";
import { inView, moveItem, runLimited } from "@/lib/gallery";

describe("moveItem", () => {
  it("moves an item forward and backward", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
  it("leaves the list alone for the same place or a place that does not exist, and never changes the input", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, -1, 1)).toEqual(list);
    expect(moveItem(list, 0, 3)).toEqual(list);
    moveItem(list, 0, 2);
    expect(list).toEqual(["a", "b", "c"]);
  });
});

describe("runLimited", () => {
  it("never runs more than `limit` at once, runs every item, and keeps result order", async () => {
    let running = 0, peak = 0;
    const out = await runLimited(Array.from({ length: 10 }, (_, i) => i), 3, async (n) => {
      running++; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5 + (n % 3)));
      running--;
      return n * 2;
    });
    expect(peak).toBe(3);
    expect(out.map((r) => (r.ok ? r.value : null))).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  });
  it("one failure does not stop the rest", async () => {
    const out = await runLimited([1, 2, 3], 2, async (n) => { if (n === 2) throw new Error("boom"); return n; });
    expect(out.map((r) => r.ok)).toEqual([true, false, true]);
    expect((out[1] as { error: Error }).error.message).toBe("boom");
  });
  it("handles an empty list", async () => { expect(await runLimited([], 3, async () => 1)).toEqual([]); });
});

describe("inView", () => {
  const items = [{ id: 1, album: "" }, { id: 2, album: "x" }, { id: 3, album: "y" }, { id: 4, album: "x" }];
  it("shows all, one album, or the pictures with no album, keeping order", () => {
    expect(inView(items, "all")).toHaveLength(4);
    expect(inView(items, "x").map((i) => i.id)).toEqual([2, 4]);
    expect(inView(items, "none").map((i) => i.id)).toEqual([1]);
  });
});
