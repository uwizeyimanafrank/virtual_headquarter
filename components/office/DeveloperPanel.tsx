"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { Metric } from "@/lib/services/types";
import type { ServiceView } from "@/lib/services/view";
import { StepUpDialog } from "@/components/office/StepUpDialog";

const TYPES = [
  { id: "http", label: "Website or API address", help: "Any address that should answer, for example your site or a client's backend." },
  { id: "mongodb", label: "MongoDB database", help: "Leave the connection string empty to watch THIS app's own database." },
  { id: "cloudinary", label: "Cloudinary", help: "Leave the fields empty to use the values from your .env." },
  { id: "render", label: "Render service", help: "Needs a Render API key and the service ID (it looks like srv-xxxxxxxx)." },
] as const;
type TypeId = (typeof TYPES)[number]["id"];

const dot = { up: "bg-emerald-400", degraded: "bg-amber-400", down: "bg-red-400", unknown: "bg-slate-400" } as const;
const word = { up: "Up", degraded: "Needs attention", down: "Down", unknown: "Not checked yet" } as const;
const input = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
const small = "rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong disabled:opacity-40";

function metricText(m: Metric) {
  if (m.value === null) return "unknown";
  if (m.unit === "bytes") return formatBytes(m.value);
  if (m.unit === "ms") return `${Math.round(m.value)} ms`;
  if (m.unit === "percent") return `${Math.round(m.value)}%`;
  return String(m.value);
}

function MetricRow({ m }: { m: Metric }) {
  const pct = m.limit && typeof m.value === "number" ? Math.min(100, (m.value / m.limit) * 100) : null;
  return (
    <li className="text-xs">
      <div className="flex justify-between"><span className="text-muted">{m.label}</span><span>{metricText(m)}{m.limit && m.unit === "bytes" ? ` of ${formatBytes(m.limit)}` : ""}</span></div>
      {pct !== null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-strong" role="progressbar" aria-label={m.label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full ${pct >= 90 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  );
}

type Form = { id: string | null; type: TypeId; name: string; baseUrl: string; healthPath: string; limitMb: string; enabled: boolean; hasCredentials: boolean; clearCredentials: boolean; creds: Record<string, string> };
const blank = (): Form => ({ id: null, type: "http", name: "", baseUrl: "", healthPath: "/", limitMb: "", enabled: true, hasCredentials: false, clearCredentials: false, creds: {} });
const CRED_FIELDS: Record<TypeId, { key: string; label: string; secret: boolean; placeholder?: string }[]> = {
  http: [{ key: "token", label: "Access token (only if the address needs one)", secret: true }],
  mongodb: [{ key: "uri", label: "Connection string (empty = this app's database)", secret: true, placeholder: "mongodb+srv://..." }],
  cloudinary: [{ key: "cloudName", label: "Cloud name", secret: false }, { key: "apiKey", label: "API key", secret: false }, { key: "apiSecret", label: "API secret", secret: true }],
  render: [{ key: "apiKey", label: "Render API key", secret: true }, { key: "serviceId", label: "Service ID", secret: false, placeholder: "srv-..." }],
};

/** The Developer dashboard: add, check, edit and remove the things you want to watch. */
export function DeveloperPanel() {
  const [services, setServices] = useState<ServiceView[] | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ services: ServiceView[] }>("/api/admin/services/check", { method: "POST", body: JSON.stringify({}) })
      .then((r) => alive && setServices(r.services))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Could not load."));
    return () => { alive = false; };
  }, [tick]);

  async function refresh(s: ServiceView) {
    setNote("");
    try {
      const r = await api<{ services: ServiceView[]; checked: number }>("/api/admin/services/check", { method: "POST", body: JSON.stringify({ ids: [s.id], force: true }) });
      setServices(r.services);
      if (r.checked === 0) setNote(`${s.name} was checked moments ago. Please wait about 30 seconds before checking again.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); }
  }

  async function save() {
    if (!form) return;
    setBusy(true); setErrors([]);
    const filled = Object.fromEntries(Object.entries(form.creds).filter(([, v]) => v.trim() !== ""));
    const body: Record<string, unknown> = {
      name: form.name, healthPath: form.healthPath || "/", enabled: form.enabled,
      limitMb: form.limitMb.trim() === "" ? null : Number(form.limitMb),
      ...(form.type === "http" ? { baseUrl: form.baseUrl } : {}),
      ...(Object.keys(filled).length > 0 ? { credentials: filled } : {}),
      ...(form.clearCredentials ? { clearCredentials: true } : {}),
    };
    try {
      if (form.id) await api(`/api/admin/services/${form.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/admin/services", { method: "POST", body: JSON.stringify({ ...body, type: form.type }) });
      setForm(null);
      setTick((t) => t + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { setRetry(() => () => void save()); return; } // needs a fresh authenticator code first
      const issues = e instanceof ApiError ? (e.data as { issues?: { path: string; message: string }[] } | null)?.issues : undefined;
      setErrors(issues?.length ? issues.map((i) => `${i.path}: ${i.message}`) : [e instanceof ApiError ? e.message : "Something went wrong."]);
    } finally { setBusy(false); }
  }

  async function remove(s: ServiceView) {
    if (!window.confirm(`Stop monitoring "${s.name}"?`)) return;
    try { await api(`/api/admin/services/${s.id}`, { method: "DELETE" }); setTick((t) => t + 1); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) setRetry(() => () => { void api(`/api/admin/services/${s.id}`, { method: "DELETE" }).then(() => setTick((t) => t + 1)); });
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  const edit = (s: ServiceView) => setForm({ id: s.id, type: s.type as TypeId, name: s.name, baseUrl: s.baseUrl, healthPath: s.healthPath, limitMb: s.limitBytes ? String(Math.round(s.limitBytes / 1048576)) : "", enabled: s.enabled, hasCredentials: s.hasCredentials, clearCredentials: false, creds: {} });
  const t = form ? TYPES.find((x) => x.id === form.type)! : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Results are reused for a few minutes so your services are not pinged all the time.</p>
        <button className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg" onClick={() => { setForm(blank()); setErrors([]); }}>Add a service</button>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {note && <p role="status" className="mb-3 text-sm text-amber-300">{note}</p>}
      {!services && !error && <p className="text-sm text-muted">Checking your services...</p>}
      {services && services.length === 0 && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Nothing is being watched yet. Add your database, your media storage or any website address.</p>}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services?.map((s) => (
          <li key={s.id} className={`rounded-2xl border bg-surface p-4 ${s.lastCheck.status === "down" ? "border-red-400/60" : "border-line"} ${s.enabled ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-xs text-muted">{TYPES.find((x) => x.id === s.type)?.label ?? s.type}{s.enabled ? "" : " (paused)"}</p>
              </div>
              <p className="flex shrink-0 items-center gap-1.5 text-xs"><span className={`h-2.5 w-2.5 rounded-full ${dot[s.lastCheck.status]}`} aria-hidden />{word[s.lastCheck.status]}</p>
            </div>
            {s.lastCheck.message && <p className="mt-2 text-sm text-muted">{s.lastCheck.message}</p>}
            {s.lastCheck.metrics.length > 0 && <ul className="mt-3 space-y-2">{s.lastCheck.metrics.map((m) => <MetricRow key={m.key} m={m} />)}</ul>}
            <p className="mt-3 text-xs text-muted">{s.lastCheck.at ? `Checked ${new Date(s.lastCheck.at).toLocaleString()}` : "Never checked"}{s.hasCredentials ? " · credentials stored" : ""}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button className={small} onClick={() => refresh(s)} disabled={!s.enabled}>Check now</button>
              <button className={small} onClick={() => edit(s)}>Edit</button>
              <button className={`${small} text-red-300`} onClick={() => remove(s)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>

      {form && t && (
        <div role="dialog" aria-modal="true" aria-label={form.id ? "Edit service" : "Add a service"} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onKeyDown={(e) => e.key === "Escape" && setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-line bg-bg p-6 sm:rounded-3xl">
            <h2 className="text-lg font-semibold">{form.id ? "Edit service" : "Add a service"}</h2>
            {!form.id && (
              <div>
                <label htmlFor="svc-type" className="mb-1 block text-sm text-muted">Kind</label>
                <select id="svc-type" className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TypeId, creds: {} })}>{TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
              </div>
            )}
            <p className="text-sm text-muted">{t.help}</p>
            <div><label htmlFor="svc-name" className="mb-1 block text-sm text-muted">Name</label><input id="svc-name" className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required /></div>
            {form.type === "http" && (
              <>
                <div><label htmlFor="svc-url" className="mb-1 block text-sm text-muted">Address</label><input id="svc-url" className={input} value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="Starts with https://" required /></div>
                <div><label htmlFor="svc-path" className="mb-1 block text-sm text-muted">Health path</label><input id="svc-path" className={input} value={form.healthPath} onChange={(e) => setForm({ ...form, healthPath: e.target.value })} /></div>
              </>
            )}
            {CRED_FIELDS[form.type].map((f) => (
              <div key={f.key}>
                <label htmlFor={`cred-${f.key}`} className="mb-1 block text-sm text-muted">{f.label}</label>
                <input id={`cred-${f.key}`} className={input} type={f.secret ? "password" : "text"} autoComplete="off" placeholder={f.placeholder ?? (form.hasCredentials ? "Stored. Leave blank to keep." : "")} value={form.creds[f.key] ?? ""} onChange={(e) => setForm({ ...form, creds: { ...form.creds, [f.key]: e.target.value } })} />
              </div>
            ))}
            {form.id && form.hasCredentials && (
              <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={form.clearCredentials} onChange={(e) => setForm({ ...form, clearCredentials: e.target.checked })} />Remove the stored credentials</label>
            )}
            <p className="text-xs text-muted">Credentials are encrypted on the server and are never shown again. Saving them asks for your authenticator code.</p>
            {(form.type === "mongodb" || form.type === "cloudinary") && (
              <div><label htmlFor="svc-limit" className="mb-1 block text-sm text-muted">Storage limit in MB (optional, for the progress bar)</label><input id="svc-limit" className={input} inputMode="numeric" value={form.limitMb} onChange={(e) => setForm({ ...form, limitMb: e.target.value })} placeholder={form.type === "mongodb" ? "512 (Atlas free tier)" : ""} /></div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />Watch this service</label>
            {errors.length > 0 && <ul role="alert" className="space-y-1 text-sm text-red-400">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm(null)} className="flex-1 rounded-xl border border-line px-4 py-2">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-accent px-4 py-2 font-medium text-bg disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      )}
      <StepUpDialog open={retry !== null} onClose={() => { setRetry(null); setBusy(false); }} onSuccess={() => { const r = retry; setRetry(null); r?.(); }} />
    </div>
  );
}
