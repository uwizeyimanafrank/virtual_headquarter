"use client";
import { useRef, useState } from "react";

const TABS = [
  { id: "hero", label: "Welcome" },
  { id: "cv", label: "Canvas CV" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Two views of the Home page. Keyboard friendly: arrow keys, Home and End move between tabs. */
export function HomeTabs({ hero, cv }: { hero: React.ReactNode; cv: React.ReactNode }) {
  const [active, setActive] = useState<TabId>("hero");
  const refs = useRef<Record<TabId, HTMLButtonElement | null>>({ hero: null, cv: null });

  function select(id: TabId) {
    setActive(id);
    refs.current[id]?.focus();
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === active);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (next === -1) return;
    e.preventDefault();
    select(TABS[next].id);
  }

  const panel = "motion-safe:animate-[fadeUp_0.55s_ease-out]";
  return (
    <div>
      <div role="tablist" aria-label="Home views" onKeyDown={onKeyDown} className="mx-auto mb-10 flex w-fit gap-1 rounded-full border border-line bg-surface p-1 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={`rounded-full px-5 py-2 text-sm transition ${active === t.id ? "bg-accent font-medium text-bg" : "text-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-hero" aria-labelledby="tab-hero" hidden={active !== "hero"} className={active === "hero" ? panel : ""}>{hero}</div>
      <div role="tabpanel" id="panel-cv" aria-labelledby="tab-cv" hidden={active !== "cv"} className={active === "cv" ? panel : ""}>{cv}</div>
    </div>
  );
}
