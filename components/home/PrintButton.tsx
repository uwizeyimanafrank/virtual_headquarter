"use client";

/** Opens the browser's print dialog; cv-print.css makes the page a clean black-on-white CV on paper (or "Save as PDF"). */
export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-xl border border-line px-5 py-2 text-sm">Print view</button>;
}
