"use client";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** True when the visitor asked their device for less motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
