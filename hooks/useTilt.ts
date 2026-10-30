"use client";
import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Makes an element lean toward the mouse. Only on devices with a real mouse (hover + fine pointer)
 * and never when the visitor asked for less motion. The element is moved directly (no React re-render
 * on every mouse move), so it stays smooth.
 */
export function useTilt<T extends HTMLElement>(maxDegrees = 8) {
  const ref = useRef<T>(null);
  const hasMouse = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useReducedMotion();
  const enabled = hasMouse && !reduced;

  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      const el = ref.current;
      if (!el || !enabled) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 (left edge) to 0.5 (right edge)
      const y = (e.clientY - r.top) / r.height - 0.5;
      const rx = Math.max(-maxDegrees, Math.min(maxDegrees, -y * maxDegrees * 2));
      const ry = Math.max(-maxDegrees, Math.min(maxDegrees, x * maxDegrees * 2));
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    },
    [enabled, maxDegrees],
  );

  const onPointerLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "";
  }, []);

  return { ref, enabled, handlers: { onPointerMove, onPointerLeave } };
}
