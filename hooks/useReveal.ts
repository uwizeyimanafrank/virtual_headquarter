"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const noSubscribe = () => () => {};

/**
 * Fade-in-when-visible for one element. Content is ALWAYS visible without JavaScript, during the
 * server render, and when the visitor asked for reduced motion. Only after the page has loaded in a
 * browser do items start hidden and appear as they scroll into view (one by one, not all together).
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  const armed = useSyncExternalStore(noSubscribe, () => true, () => false); // false on the server, true in the browser
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !armed || reduced || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armed, reduced]);

  const hidden = armed && !reduced && !seen && typeof IntersectionObserver !== "undefined";
  return { ref, hidden };
}
