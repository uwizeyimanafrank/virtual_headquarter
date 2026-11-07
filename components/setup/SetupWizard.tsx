"use client";
import { useEffect, useState } from "react";

type Values = { mongoUri: string; cloudName: string; cloudApiKey: string; cloudApiSecret: string; geminiKey: string; officeSlug: string; officePassword: string };
type Test = { ok: boolean; message: string } | "testing" | null;
type Saved = { database: boolean; images: boolean; ai: boolean; office: boolean };

const inputCls = "w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent";
const btnCls = "rounded-xl bg-accent px-5 py-2.5 font-medium text-bg disabled:opacity-50";
const ghostCls = "rounded-xl border border-line px-4 py-2 text-sm hover:border-accent disabled:opacity-50";
const MIN_PASSWORD = 12;

async function call<T>(body: unknown): Promise<{ status: number; data: T }> {
  const r = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, data: (await r.json().catch(() => ({}))) as T };
}

function Card({ n, title, badge, children }: { n: number; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/60 text-sm font-semibold text-accent">{n}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge && <span className="ml-auto rounded-full border border-line px-3 py-1 text-xs text-muted">{badge}</span>}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Result({ t }: { t: Test }) {
  if (!t) return null;
  if (t === "testing") return <p className="text-sm text-muted" role="status">Testing...</p>;
  return <p role="status" className={`text-sm ${t.ok ? "text-emerald-400" : "text-red-400"}`}>{t.ok ? "Works. " : ""}{t.message}</p>;
}

export function SetupWizard() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [codeMsg, setCodeMsg] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [v, setV] = useState<Values>({ mongoUri: "", cloudName: "", cloudApiKey: "", cloudApiSecret: "", geminiKey: "", officeSlug: "", officePassword: "" });
  const [again, setAgain] = useState("");
  const [mongoT, setMongoT] = useState<Test>(null);
  const [cloudT, setCloudT] = useState<Test>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ slug: string | null; written: string[] } | null>(null);
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    void fetch("/api/setup").then((r) => (r.ok ? r.json() : null)).then((d: { saved: Saved; suggestedSlug: string } | null) => {
      if (!d) return;
      setSaved(d.saved);
      if (!d.saved.office) setV((x) => ({ ...x, officeSlug: d.suggestedSlug }));
    }).catch(() => {});
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setCodeMsg("");
    const r = await call<{ error?: string }>({ code, action: "check-code" });
    if (r.status === 200) setUnlocked(true); else setCodeMsg(r.data.error ?? "That code is not right.");
  }
  async function testMongo() {
    setMongoT("testing");
    const r = await call<{ ok: boolean; message: string; error?: string }>({ code, action: "test-mongo", values: v });
    setMongoT({ ok: r.data.ok === true, message: r.data.message ?? r.data.error ?? "Could not test." });
  }
  async function testCloud() {
    setCloudT("testing");
    const r = await call<{ ok: boolean; message: string; error?: string }>({ code, action: "test-cloudinary", values: v });
    setCloudT({ ok: r.data.ok === true, message: r.data.message ?? r.data.error ?? "Could not test." });
  }
  async function save() {
    setError("");
    if (v.officePassword && v.officePassword !== again) { setError("The two Office passwords are different."); return; }
    setBusy(true);
    try {
      const r = await call<{ ok?: boolean; error?: string; slug?: string | null; written?: string[] }>({ code, action: "save", values: v });
      if (r.status === 200 && r.data.ok) setDone({ slug: r.data.slug ?? null, written: r.data.written ?? [] });
      else setError(r.data.error ?? "Could not save.");
    } finally { setBusy(false); }
  }

  if (done) {
    const slug = done.slug ?? v.officeSlug;
    const origin = window.location.origin;
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-6">
          <h1 className="text-2xl font-semibold">Saved. One last step.</h1>
          <p className="mt-2 text-muted">Your settings are in a private file on this computer (<code className="font-mono">.env.local</code>). It is never uploaded to GitHub.</p>
        </div>
        <ol className="space-y-3 rounded-2xl border border-line bg-surface p-6 text-sm">
          <li><span className="font-medium">1.</span> In the terminal where the app is running, press <kbd className="rounded border border-line px-1.5 font-mono">Ctrl</kbd> + <kbd className="rounded border border-line px-1.5 font-mono">C</kbd>.</li>
          <li><span className="font-medium">2.</span> Start it again: <code className="rounded bg-bg px-2 py-1 font-mono">npm run dev</code></li>
          <li><span className="font-medium">3.</span> Open your private Office door: <code className="break-all rounded bg-bg px-2 py-1 font-mono">{origin}/{slug}/login</code></li>
          <li className="text-muted">Save that address: it is the only way in, and it is not linked anywhere on the site.</li>
        </ol>
        <p className="text-xs text-muted">Saved: {done.written.join(", ")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Connect your services</h1>
        <p className="mt-3 text-muted">The site already works in demo mode. Add these when you are ready. Each step has a test button, and nothing leaves this computer except the test itself.</p>
      </header>

      {!unlocked ? (
        <form onSubmit={unlock} className="space-y-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Setup code</h2>
          <p className="text-sm text-muted">Look in the terminal where you ran <code className="font-mono">npm run dev</code>. It printed a short code. This keeps other devices on your Wi-Fi out.</p>
          <div className="flex gap-2">
            <label className="flex-1"><span className="sr-only">Setup code</span><input className={`${inputCls} font-mono`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 3fa9c21b" autoComplete="off" autoFocus /></label>
            <button className={btnCls} disabled={!code.trim()}>Unlock</button>
          </div>
          {codeMsg && <p role="alert" className="text-sm text-red-400">{codeMsg}</p>}
        </form>
      ) : (
        <>
          <Card n={1} title="Database" badge={saved?.database ? "already saved" : "recommended"}>
            <p className="text-sm text-muted">Your MongoDB Atlas link. In Atlas: <em>Connect → Drivers</em>, copy the link, and put your database password where it says <code className="font-mono">&lt;password&gt;</code>.</p>
            <label className="block text-sm">Connection link<input className={`${inputCls} mt-1 font-mono text-sm`} value={v.mongoUri} onChange={set("mongoUri")} placeholder="mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/vhq" autoComplete="off" spellCheck={false} /></label>
            <div className="flex items-center gap-3"><button type="button" className={ghostCls} onClick={() => void testMongo()} disabled={!v.mongoUri.trim() || mongoT === "testing"}>Test connection</button><Result t={mongoT} /></div>
          </Card>

          <Card n={2} title="Images and files" badge={saved?.images ? "already saved" : "optional"}>
            <p className="text-sm text-muted">From your Cloudinary dashboard. Without it the site uses the built-in sample pictures.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">Cloud name<input className={`${inputCls} mt-1`} value={v.cloudName} onChange={set("cloudName")} autoComplete="off" /></label>
              <label className="block text-sm">API key<input className={`${inputCls} mt-1`} value={v.cloudApiKey} onChange={set("cloudApiKey")} autoComplete="off" /></label>
              <label className="block text-sm">API secret<input type="password" className={`${inputCls} mt-1`} value={v.cloudApiSecret} onChange={set("cloudApiSecret")} autoComplete="off" /></label>
            </div>
            <div className="flex items-center gap-3"><button type="button" className={ghostCls} onClick={() => void testCloud()} disabled={!(v.cloudName && v.cloudApiKey && v.cloudApiSecret) || cloudT === "testing"}>Test Cloudinary</button><Result t={cloudT} /></div>
          </Card>

          <Card n={3} title="AI assistant" badge={saved?.ai ? "already saved" : "optional"}>
            <p className="text-sm text-muted">A free Gemini key from Google AI Studio turns on the assistant inside your Office.</p>
            <label className="block text-sm">Gemini API key<input type="password" className={`${inputCls} mt-1 font-mono text-sm`} value={v.geminiKey} onChange={set("geminiKey")} autoComplete="off" /></label>
          </Card>

          <Card n={4} title="Your Office" badge={saved?.office ? "address saved" : "required"}>
            <p className="text-sm text-muted">The Office is your private control room. Its address is secret and not linked from the site.</p>
            <label className="block text-sm">Secret address<input className={`${inputCls} mt-1 font-mono`} value={v.officeSlug} onChange={set("officeSlug")} autoComplete="off" spellCheck={false} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">Office password<input type="password" className={`${inputCls} mt-1`} value={v.officePassword} onChange={set("officePassword")} autoComplete="new-password" /></label>
              <label className="block text-sm">Type it again<input type="password" className={`${inputCls} mt-1`} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></label>
            </div>
            <p className="text-xs text-muted">At least {MIN_PASSWORD} characters. Only a scrambled version is saved. Your password itself is never written anywhere.</p>
          </Card>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button className={`${btnCls} w-full`} onClick={() => void save()} disabled={busy}>{busy ? "Saving..." : "Save settings"}</button>
        </>
      )}
    </div>
  );
}
