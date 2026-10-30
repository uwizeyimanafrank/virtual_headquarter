"use client";
import { useCallback, useEffect, useState } from "react";

const STEPS = [
  { target: "nav-home", title: "Dashboard", text: "Your home base: setup progress and anything that needs attention." },
  { target: "nav-setup", title: "Setup", text: "The checklist and the Config Doctor, which tests your database and services in plain words." },
  { target: "nav-content", title: "Content", text: "Add, edit and remove Museum items: projects, certificates, stories, books. No code needed." },
  { target: "nav-messages", title: "Messages", text: "What visitors send you from the Connect page." },
  { target: "nav-ai", title: "AI Twin", text: "Your assistant. It can see safe numbers about your site, never your secrets." },
  { target: "nav-developer", title: "Developer", text: "Watch your database, media storage and hosting in one place." },
  { target: "nav-vault", title: "Vault", text: "Store .env files encrypted. Only your passphrase can open them." },
  { target: "nav-security", title: "Security", text: "See your devices, sign out everywhere, and use the panic button." },
  { target: "nav-settings", title: "Settings", text: "Your name, photo, bio and the wording on the public site." },
] as const;

/** A light spotlight tour of the Office menu. Skippable, restartable, no libraries. */
export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${STEPS[i].target}"]`);
    if (!el) return setRect(null);
    el.scrollIntoView({ block: "nearest", inline: "center" });
    setRect(el.getBoundingClientRect());
  }, [i]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(measure); // async on purpose: measure after the page painted
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", measure); };
  }, [open, measure]);

  if (!open) return null;
  const wide = typeof window !== "undefined" && window.innerWidth >= 768;
  const tip: React.CSSProperties = wide && rect
    ? { position: "fixed", top: Math.min(rect.top, window.innerHeight - 220), left: rect.right + 16, width: 300 }
    : { position: "fixed", left: 16, right: 16, bottom: 16 };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Office tour" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="absolute inset-0" />
      {rect && <div className="pointer-events-none absolute rounded-lg ring-2 ring-accent" style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)" }} />}
      {!rect && <div className="absolute inset-0 bg-black/65" />}
      <div style={tip} className="rounded-2xl border border-line bg-bg p-4 shadow-xl">
        <p className="text-xs text-muted">Step {i + 1} of {STEPS.length}</p>
        <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm text-muted">{step.text}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button className="text-sm text-muted underline" onClick={onClose}>Skip tour</button>
          <div className="flex gap-2">
            {i > 0 && <button className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={() => setI(i - 1)}>Back</button>}
            <button autoFocus className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-bg" onClick={() => (i === STEPS.length - 1 ? onClose() : setI(i + 1))}>
              {i === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
