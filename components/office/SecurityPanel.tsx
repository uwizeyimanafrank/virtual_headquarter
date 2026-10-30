"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hardNavigate } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

type Sess = { id: string; deviceLabel: string; createdAt: string; lastSeen: string; current: boolean };
type Ev = { id: string; event: string; ok: boolean; deviceLabel: string; detail: string; createdAt: string };

const when = (s: string) => new Date(s).toLocaleString();
const btn = "rounded-xl border border-line px-4 py-2 text-sm hover:bg-surface-strong";

/** Devices, sign-out-everywhere, panic button and the latest security events. */
export function SecurityPanel() {
  // The Office address is the current URL minus "/security".
  const base = usePathname().replace(/\/security\/?$/, "");
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [msg, setMsg] = useState("");

  const [tick, setTick] = useState(0); // bump to reload the lists
  const reload = () => setTick((t) => t + 1);

  useEffect(() => {
    let alive = true;
    Promise.all([api<{ sessions: Sess[] }>("/api/admin/sessions"), api<{ events: Ev[] }>("/api/admin/audit")])
      .then(([s, e]) => {
        if (!alive) return;
        setSessions(s.sessions);
        setEvents(e.events);
      })
      .catch((err) => alive && setMsg(err instanceof ApiError ? err.message : "Could not load."));
    return () => { alive = false; };
  }, [tick]);

  async function revoke(id: string) {
    await api(`/api/admin/sessions/${id}`, { method: "DELETE" });
    reload();
  }
  async function signOutEverywhere() {
    const r = await api<{ ended: number }>("/api/admin/sessions/revoke-all", { method: "POST" });
    setMsg(`Signed out ${r.ended} other device(s).`);
    reload();
  }
  async function panic() {
    if (!window.confirm("Panic: this signs out EVERY device (including this one) and blocks logins for 1 hour. Continue?")) return;
    await api("/api/admin/panic", { method: "POST" });
    hardNavigate(`${base}/login`);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-medium">Signed-in devices</h2>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
              <div>
                <p className="text-sm">{s.deviceLabel || "Unknown device"} {s.current && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">this device</span>}</p>
                <p className="text-xs text-muted">Last active {when(s.lastSeen)}</p>
              </div>
              {!s.current && <button className={btn} onClick={() => revoke(s.id)}>Sign out</button>}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btn} onClick={signOutEverywhere}>Sign out everywhere else</button>
          <button className="rounded-xl border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10" onClick={panic}>Panic: lock everything</button>
        </div>
        {msg && <p role="status" className="mt-2 text-sm text-muted">{msg}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recent security events</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span><span className={e.ok ? "text-accent" : "text-red-400"}>{e.ok ? "ok" : "failed"}</span> &middot; {e.event.replaceAll("_", " ")}{e.detail ? ` (${e.detail})` : ""}</span>
              <span className="text-xs text-muted">{e.deviceLabel} &middot; {when(e.createdAt)}</span>
            </li>
          ))}
          {events.length === 0 && <li className="px-3 py-2 text-muted">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  );
}
