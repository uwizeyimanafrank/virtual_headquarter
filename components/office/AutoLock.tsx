"use client";
import { useEffect, useRef } from "react";
import { hardNavigate } from "@/lib/nav";
import { api } from "@/lib/api";

const IDLE_MS = 10 * 60_000; // lock after 10 minutes without activity
const HIDDEN_MS = 2 * 60_000; // lock if the tab was hidden for 2 minutes
const PING_MS = 4 * 60_000; // keep the session alive while the owner is active

/** Locks the Office when you walk away. Renders nothing. */
export function AutoLock({ base }: { base: string }) {
  const lastActive = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    lastActive.current = Date.now();
    const bump = () => { lastActive.current = Date.now(); };
    const lock = async () => {
      try { await api("/api/admin/logout", { method: "POST" }); } catch { /* already out */ }
      hardNavigate(`${base}/login`);
    };
    const onVisibility = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else {
        if (hiddenAt.current && Date.now() - hiddenAt.current > HIDDEN_MS) void lock();
        hiddenAt.current = null;
      }
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    const check = setInterval(() => { if (Date.now() - lastActive.current > IDLE_MS) void lock(); }, 15_000);
    const ping = setInterval(async () => {
      if (Date.now() - lastActive.current > PING_MS) return; // idle: let the server timer run out
      try { await api("/api/admin/session/ping", { method: "POST" }); } catch { hardNavigate(`${base}/login`); }
    }, PING_MS / 2);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(check);
      clearInterval(ping);
    };
  }, [base]);

  return null;
}
