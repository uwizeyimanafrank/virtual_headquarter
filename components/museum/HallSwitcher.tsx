"use client";

import { useRef } from "react";
import { HALLS, HALL_LABELS, nextHall, type Hall } from "@/lib/halls";

/**
 * Two doors at the top of the Museum: Story Tour and Glass Cases. A tab list (arrow keys, Home and End work),
 * so it is the same on phones and desktops. It only reports the choice; the page keeps the data, so switching never reloads anything.
 */
export function HallSwitcher({ hall, onChange }: { hall: Hall; onChange: (h: Hall) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent) => {
    const to = nextHall(hall, e.key);
    if (!to) return;
    e.preventDefault();
    onChange(to);
    refs.current[to]?.focus();
  };
  return (
    <div role="tablist" aria-label="Museum halls" onKeyDown={onKey} className="relative z-10 mx-auto mb-6 flex w-fit max-w-full gap-1 rounded-full border border-line bg-surface/70 p-1 backdrop-blur">
      {HALLS.map((h) => {
        const on = h === hall;
        return (
          <button
            key={h}
            ref={(el) => { refs.current[h] = el; }}
            role="tab"
            id={`hall-tab-${h}`}
            aria-selected={on}
            aria-controls={`hall-panel-${h}`}
            tabIndex={on ? 0 : -1}
            type="button"
            title={HALL_LABELS[h].hint}
            onClick={() => onChange(h)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${on ? "bg-accent text-bg" : "text-muted hover:text-fg"}`}
          >
            {HALL_LABELS[h].title}
          </button>
        );
      })}
    </div>
  );
}
