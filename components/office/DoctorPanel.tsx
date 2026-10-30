"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StepUpDialog } from "@/components/office/StepUpDialog";

type Check = { id: string; label: string; status: "ok" | "warn" | "fail"; detail: string; why: string; fix: string };
type Test = { ok: boolean; message: string };
type TestBody = { kind: "mongodb"; uri: string } | { kind: "cloudinary"; cloudName: string; apiKey: string; apiSecret: string };

const dot = { ok: "bg-emerald-400", warn: "bg-amber-400", fail: "bg-red-400" } as const;
const word = { ok: "OK", warn: "Heads up", fail: "Needs fixing" } as const;
const input = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
const btn = "rounded-xl border border-line px-4 py-2 text-sm hover:bg-surface-strong disabled:opacity-50";

const GUIDES = {
  Local: [
    "Copy .env.example to .env and fill in the values (see the checks above for what each one does).",
    "Run npm install, then npm run dev.",
    "Set APP_URL to the address that npm run dev prints.",
    "In MongoDB Atlas open Network Access and add your current IP address.",
  ],
  Render: [
    "Create a Web Service from your GitHub repository.",
    "Build command: npm install && npm run build. Start command: npm start.",
    "Open the Environment tab and add every variable from the checks above. Use new secrets, not your local ones.",
    "Set APP_URL to the https address Render gives you. Change it again if you add your own domain.",
    "Atlas Network Access: Render's outgoing addresses change, so the practical choice is Atlas's 'Allow access from anywhere' button and a strong database password. This is a trade-off.",
    "Free instances sleep when unused, so the first visit can take up to a minute.",
    "After deploying, press Re-run checks here and open the health page to confirm.",
  ],
  Vercel: [
    "Import your GitHub repository as a new project.",
    "Open Settings, Environment Variables, and add every variable for Production.",
    "Set APP_URL to your production domain (https).",
    "Atlas Network Access: Vercel uses changing addresses, so allow access from anywhere in Atlas and keep a strong database password. This is a trade-off.",
    "Variables whose names start with NEXT_PUBLIC_ are baked in at build time: redeploy after changing them.",
    "After deploying, press Re-run checks here.",
  ],
} as const;

/** Config Doctor: plain-words checks, test-without-saving, and per-host setup guides. */
export function DoctorPanel() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [uri, setUri] = useState("");
  const [cloud, setCloud] = useState({ cloudName: "", apiKey: "", apiSecret: "" });
  const [result, setResult] = useState<{ which: string; r: Test } | null>(null);
  const [pending, setPending] = useState<TestBody | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<keyof typeof GUIDES>("Local");

  useEffect(() => {
    let alive = true;
    api<{ checks: Check[] }>("/api/admin/doctor")
      .then((r) => alive && setChecks(r.checks))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, [tick]);

  async function runTest(body: TestBody) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api<Test>("/api/admin/doctor/test", { method: "POST", body: JSON.stringify(body) });
      setResult({ which: body.kind, r });
      // Pasted values are cleared right after testing. Nothing was saved.
      if (body.kind === "mongodb") setUri(""); else setCloud({ cloudName: "", apiKey: "", apiSecret: "" });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPending(body);
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Health checks</h2>
          <button className={btn} onClick={() => { setChecks(null); setTick((t) => t + 1); }}>Re-run checks</button>
        </div>
        {!checks && !error && <p className="text-sm text-muted">Checking...</p>}
        <ul className="space-y-2">
          {checks?.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface p-3">
              <p className="flex items-center gap-2 text-sm font-medium"><span className={`inline-block h-2.5 w-2.5 rounded-full ${dot[c.status]}`} />{c.label}<span className="text-xs font-normal text-muted">{word[c.status]}</span></p>
              <p className="mt-1 text-sm text-muted">{c.detail}</p>
              {c.status !== "ok" && (
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="text-muted">Why this matters: </span>{c.why}</p>
                  <p><span className="text-muted">How to fix: </span>{c.fix}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Test without saving</h2>
          <p className="text-sm text-muted">Paste a value to see if it works. It is tested once, then forgotten. Nothing is saved and nothing is written to logs. To really use a value you still put it in your .env or your host&apos;s Environment settings.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="mb-2 text-sm font-medium">MongoDB connection string</p>
          <input className={input} type="password" autoComplete="off" placeholder="mongodb+srv://..." value={uri} onChange={(e) => setUri(e.target.value)} />
          <button className={`${btn} mt-2`} disabled={busy || !uri} onClick={() => runTest({ kind: "mongodb", uri })}>{busy ? "Testing..." : "Test connection"}</button>
          {result?.which === "mongodb" && <p role="status" className={`mt-2 text-sm ${result.r.ok ? "text-emerald-400" : "text-amber-300"}`}>{result.r.message}</p>}
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="mb-2 text-sm font-medium">Cloudinary</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className={input} autoComplete="off" placeholder="Cloud name" value={cloud.cloudName} onChange={(e) => setCloud({ ...cloud, cloudName: e.target.value })} />
            <input className={input} autoComplete="off" placeholder="API key" value={cloud.apiKey} onChange={(e) => setCloud({ ...cloud, apiKey: e.target.value })} />
            <input className={input} type="password" autoComplete="off" placeholder="API secret" value={cloud.apiSecret} onChange={(e) => setCloud({ ...cloud, apiSecret: e.target.value })} />
          </div>
          <button className={`${btn} mt-2`} disabled={busy || !cloud.cloudName || !cloud.apiKey || !cloud.apiSecret} onClick={() => runTest({ kind: "cloudinary", ...cloud })}>{busy ? "Testing..." : "Test Cloudinary"}</button>
          {result?.which === "cloudinary" && <p role="status" className={`mt-2 text-sm ${result.r.ok ? "text-emerald-400" : "text-amber-300"}`}>{result.r.message}</p>}
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Setting it up on a host</h2>
        <p className="mb-3 text-sm text-muted">The app cannot change the settings of your host for you. Follow the steps, then press Re-run checks.</p>
        <div role="tablist" className="mb-3 flex gap-2">
          {(Object.keys(GUIDES) as (keyof typeof GUIDES)[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-surface-strong text-accent" : "text-muted hover:text-fg"}`}>{k}</button>
          ))}
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">{GUIDES[tab].map((s) => <li key={s}>{s}</li>)}</ol>
      </section>

      <StepUpDialog open={pending !== null} onClose={() => setPending(null)} onSuccess={() => { const b = pending; setPending(null); if (b) void runTest(b); }} />
    </div>
  );
}
