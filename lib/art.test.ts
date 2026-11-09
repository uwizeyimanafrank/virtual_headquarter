// @vitest-environment node
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SCENES, sceneByKey } from "@/lib/art";
import { SLOTS } from "@/lib/image-slots";

const read = (file: string) => readFileSync(path.join(process.cwd(), "public", file), "utf8");

describe("art kit", () => {
  it("has the seven scenes with unique keys", () => {
    expect(SCENES).toHaveLength(7);
    expect(new Set(SCENES.map((s) => s.key)).size).toBe(7);
    expect(sceneByKey("avatar-wave")?.aspect).toBe("1:1");
  });
  for (const scene of SCENES) {
    describe(scene.key, () => {
      const svg = read(scene.file);
      it("is a light, self-contained SVG", () => {
        expect(statSync(path.join(process.cwd(), "public", scene.file)).size).toBeLessThan(40 * 1024);
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg).not.toMatch(/<(image|script|foreignObject|text|style)\b/i); // no pictures, scripts, fonts or CSS inside
        expect(svg).not.toMatch(/(href|src)\s*=/i);
        expect([...svg.matchAll(/https?:\/\/[^"'\s)]+/g)].every((m) => m[0] === "http://www.w3.org/2000/svg")).toBe(true); // check:urls-ignore
      });
      it("has every named layer, each once", () => {
        for (const id of scene.layers) expect(svg.match(new RegExp(`id="${id}"`, "g")), `${scene.key}#${id}`).toHaveLength(1);
      });
      it("matches its stated shape", () => {
        const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
        const [a, b] = scene.aspect.split(":").map(Number);
        expect(Math.abs(Number(vb[1]) / Number(vb[2]) - a / b)).toBeLessThan(0.02);
      });
    });
  }
  it("every drawn scene is used by at least one slot, and every slot picture exists", () => {
    const used = new Set(SLOTS.map((s) => s.defaultSrc));
    for (const scene of SCENES) expect(used.has(scene.file), scene.file).toBe(true);
  });
});
