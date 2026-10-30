"use client";
import { useState } from "react";
import { hardNavigate } from "@/lib/nav";
import { api, ApiError } from "@/lib/api";

type Step = "password" | "2fa" | "enroll" | "recovery";

const input = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-fg outline-none placeholder:text-muted focus:border-accent";
const button = "w-full rounded-xl bg-accent px-4 py-3 font-medium text-bg transition hover:opacity-90 disabled:opacity-50";

/** Office login: password, then authenticator code. First time: scan the QR and save recovery codes. */
export function LoginFlow() {
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The Office address is the page we are on, minus "/login".
  const goToOffice = () => hardNavigate(window.location.pathname.replace(/\/login\/?$/, "") || "/");

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await api<{ step: "2fa" | "enroll" }>("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setPassword("");
      if (r.step === "enroll") {
        const q = await api<{ qr: string; secret: string }>("/api/admin/2fa/enroll", { method: "POST" });
        setQr(q.qr);
        setSecret(q.secret);
      }
      setStep(r.step);
    });
  };

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (step === "2fa") {
        await api("/api/admin/2fa/verify", { method: "POST", body: JSON.stringify({ code }) });
        goToOffice();
      } else {
        const r = await api<{ recoveryCodes: string[] }>("/api/admin/2fa/confirm", { method: "POST", body: JSON.stringify({ code }) });
        setCodes(r.recoveryCodes);
        setStep("recovery");
      }
    });
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 backdrop-blur">
      <h1 className="mb-1 text-xl font-semibold">The Office</h1>
      <p className="mb-5 text-sm text-muted">
        {step === "password" && "Sign in to continue."}
        {step === "2fa" && "Enter the 6-digit code from your authenticator app, or a recovery code."}
        {step === "enroll" && "First time here: scan this QR code with an authenticator app, then enter the code it shows."}
        {step === "recovery" && "Save these recovery codes now. Each works once. They are shown only this one time."}
      </p>

      {step === "password" && (
        <form onSubmit={submitPassword} className="space-y-3">
          <input className={input} type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className={button} disabled={busy}>{busy ? "Checking..." : "Continue"}</button>
        </form>
      )}

      {(step === "2fa" || step === "enroll") && (
        <form onSubmit={submitCode} className="space-y-3">
          {step === "enroll" && qr && (
            <div className="flex flex-col items-center gap-2">
              {/* QR code is a data: image made by our own server */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Authenticator QR code" width={220} height={220} className="rounded-lg bg-white p-1" />
              <p className="break-all text-center font-mono text-xs text-muted">Manual key: {secret}</p>
            </div>
          )}
          <input className={input} inputMode={step === "enroll" ? "numeric" : "text"} autoComplete="one-time-code" placeholder={step === "enroll" ? "6-digit code" : "Code or recovery code"} value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className={button} disabled={busy}>{busy ? "Checking..." : step === "enroll" ? "Turn on 2FA" : "Sign in"}</button>
        </form>
      )}

      {step === "recovery" && (
        <div className="space-y-3">
          <ul className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg/60 p-3 font-mono text-sm">
            {codes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <button type="button" className="w-full rounded-xl border border-line px-4 py-2 text-sm" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>Copy codes</button>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1" />
            I saved these codes somewhere safe (not on this device only).
          </label>
          <button className={button} disabled={!saved} onClick={goToOffice}>Enter the Office</button>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
