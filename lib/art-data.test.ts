// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildArtModule } from "../scripts/build-art-data.mjs";
import { ART_SVG } from "@/lib/art-data.generated";
import { SCENES } from "@/lib/art";

describe("generated art module", () => {
  it("is up to date with public/art (run npm run build:art if this fails)", () => {
    expect(readFileSync(path.join(process.cwd(), "lib/art-data.generated.ts"), "utf8")).toBe(buildArtModule());
  });
  it("has every scene as SVG text", () => {
    for (const s of SCENES) expect(ART_SVG[s.file]?.startsWith("<svg"), s.file).toBe(true);
  });
});
