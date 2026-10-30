"use client";
import { useSyncExternalStore } from "react";

/**
 * Reactive CSS media query, e.g. useMediaQuery("(min-width: 768px)").
 * Returns `fallback` on the server and during the first render so the page
 * markup matches between server and browser.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}
