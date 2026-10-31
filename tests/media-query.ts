import { vi } from "vitest";
import { act } from "@testing-library/react";

/** Pretend to be a browser/device. Keys are parts of a media query, values say whether they match. */
export function mockMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Object.entries(matches).some(([part, on]) => on && query.includes(part)),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/**
 * Like mockMedia, but you can change the answer later and the page is told, the way a real
 * browser does when you resize the window or switch a setting. Example: media.set({ "min-width": false }).
 */
export function createMedia(initial: Record<string, boolean>) {
  const state: Record<string, boolean> = { ...initial };
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() { return Object.entries(state).some(([part, on]) => on && query.includes(part)); },
    media: query,
    addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
  }));
  return {
    set(patch: Record<string, boolean>) {
      Object.assign(state, patch);
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}
