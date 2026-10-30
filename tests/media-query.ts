import { vi } from "vitest";

/** Pretend to be a browser/device. Keys are parts of a media query, values say whether they match. */
export function mockMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Object.entries(matches).some(([part, on]) => on && query.includes(part)),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
