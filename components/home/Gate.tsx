"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const CURTAIN_MS = 520;

/**
 * The big button at the bottom of Home. Fades the screen to dark, then moves to the Museum
 * without a full page reload. With reduced motion (or ctrl/cmd-click) it just navigates normally.
 */
export function Gate() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (reduced || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // let the link behave normally
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(() => router.push("/museum"), CURTAIN_MS);
  }

  return (
    <section className="mx-auto mt-24 max-w-3xl pb-24 text-center">
      <p className="mb-6 text-lg text-muted">The foundation is laid. Do you wish to inspect the execution?</p>
      <Link
        href="/museum"
        onClick={onClick}
        className="inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 text-lg font-semibold text-bg shadow-lg shadow-accent/20 transition hover:scale-[1.03] hover:shadow-accent/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        Continue to the Museum <span aria-hidden>&rarr;</span>
      </Link>
      {leaving && <div data-testid="curtain" aria-hidden className="fixed inset-0 z-50 bg-bg motion-safe:animate-[curtain_0.5s_ease-in_forwards]" />}
    </section>
  );
}
