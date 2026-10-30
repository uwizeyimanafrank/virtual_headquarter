import { describe, expect, it } from "vitest";
import { applySampleRules } from "@/lib/samples-data";

const items = [
  { id: 1, type: "project", isSample: true },
  { id: 2, type: "project", isSample: false },
  { id: 3, type: "certificate", isSample: true },
  { id: 4, type: "book", isSample: true },
];
const ids = (list: { id: number }[]) => list.map((i) => i.id);

describe("applySampleRules", () => {
  it("hides every sample when showSamples is off", () => {
    expect(ids(applySampleRules(items, { showSamples: false, autoHide: true }))).toEqual([2]);
  });
  it("hides samples of a type once a real item of that type exists (autoHide on)", () => {
    expect(ids(applySampleRules(items, { showSamples: true, autoHide: true }))).toEqual([2, 3, 4]);
  });
  it("keeps all samples when autoHide is off", () => {
    expect(ids(applySampleRules(items, { showSamples: true, autoHide: false }))).toEqual([1, 2, 3, 4]);
  });
  it("shows only samples when there is nothing real", () => {
    expect(ids(applySampleRules(items.filter((i) => i.isSample), { showSamples: true, autoHide: true }))).toEqual([1, 3, 4]);
  });
});
