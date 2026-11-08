// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sniffImage } from "@/lib/image-sniff";

const bytes = (...n: (number | string)[]) => Uint8Array.from(n.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("sniffImage", () => {
  it("recognises the five accepted kinds by their first bytes", () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("jpg");
    expect(sniffImage(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe("png");
    expect(sniffImage(bytes("GIF89a", 1, 0))).toBe("gif");
    expect(sniffImage(bytes("GIF87a", 1, 0))).toBe("gif");
    expect(sniffImage(bytes("RIFF", 1, 2, 3, 4, "WEBP", "VP8 "))).toBe("webp");
    expect(sniffImage(bytes(0, 0, 0, 0x1c, "ftypavif", 0, 0))).toBe("avif");
  });
  it("refuses SVG, web pages, scripts, programs, empty and truncated files", () => {
    for (const b of [bytes("<svg xmlns='x'></svg>"), bytes("<!DOCTYPE html><html>"), bytes("#!/bin/sh\necho"), bytes("MZ", 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0), bytes(), bytes(0xff, 0xd8), bytes("RIFF", 1, 2, 3, 4, "WAVE", "fmt "), bytes("GIF8")]) {
      expect(sniffImage(b)).toBeNull();
    }
  });
});
