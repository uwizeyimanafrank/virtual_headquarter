"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * "Show on page" from Office > Images opens a public page with ?show-slot=<key>. This scrolls to that
 * picture and outlines it for a few seconds. It only draws an outline: it reveals nothing private.
 */
export function SlotHighlighter() {
  const key = useSearchParams().get("show-slot");
  useEffect(() => {
    if (!key) return;
    const el = Array.from(document.querySelectorAll<HTMLElement>("[data-slot]")).find((e) => e.dataset.slot === key);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const old = { outline: el.style.outline, offset: el.style.outlineOffset };
    el.style.outline = "3px solid #2dd4bf";
    el.style.outlineOffset = "-3px";
    const label = document.createElement("div");
    label.textContent = key;
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:absolute;left:8px;top:8px;z-index:50;padding:2px 10px;border-radius:999px;background:#2dd4bf;color:#04141a;font:600 12px ui-monospace,monospace";
    el.appendChild(label);
    const t = setTimeout(() => { el.style.outline = old.outline; el.style.outlineOffset = old.offset; label.remove(); }, 6000);
    return () => { clearTimeout(t); el.style.outline = old.outline; el.style.outlineOffset = old.offset; label.remove(); };
  }, [key]);
  return null;
}
