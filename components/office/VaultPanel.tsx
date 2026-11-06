"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StepUpDialog } from "@/components/office/StepUpDialog";
import { VaultCryptoError } from "@/lib/vault-crypto";
import { MAX_CONTENT_CHARS, MAX_LABEL_CHARS, MASK, openSecret, parseEnv, passphraseStrength, sealSecret, type VaultSecret } from "@/lib/vault-entry";
import { MAX_VAULT_PAYLOAD_CHARS } from "@/lib/vault-payload";
import { backupFileName, makeBackup, parseBackup } from "@/lib/vault-backup";

type Entry = { id: string; payload: string; createdAt: string };
export const REVEAL_SECONDS = 30; // the secret hides itself after this long
export const CLIPBOARD_CLEAR_MS = 20_000; // and a copied value is wiped from the clipboard after this long

const inputCls = "w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent";
const btnCls = "rounded-xl bg-accent px-4 py-2 font-medium text-bg disabled:opacity-50";
const ghostCls = "rounded-xl border border-line px-4 py-2 text-sm hover:border-accent disabled:opacity-50";

function Lock({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d={open ? "M8 10V7a4 4 0 0 1 7.5-2" : "M8 10V7a4 4 0 0 1 8 0v3"} />
    </svg>
  );
}

/** The vault. Encryption and decryption happen HERE, in the browser. The server only stores ciphertext. */
export function VaultPanel() {
  const [entries, setEntries] = useState<Entry[] | null>(null); // null = list not loaded yet
  const [max, setMax] = useState(200);
  const [error, setError] = useState("");
  const [note, setNote] = useState(""); // friendly result messages (backup and import)
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null); // action waiting for a fresh authenticator code
  const [adding, setAdding] = useState(false);
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ id: string; secret: VaultSecret } | null>(null);

  /** Runs an API action. If the server wants a fresh authenticator code, asks for it and runs the action again. */
  async function guard(fn: () => Promise<void>): Promise<void> {
    setError("");
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPending(() => () => void guard(fn));
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  const loadList = () => guard(async () => {
    setBusy(true);
    try {
      const r = await api<{ entries: Entry[]; max: number }>("/api/admin/vault");
      setEntries(r.entries);
      setMax(r.max);
    } finally { setBusy(false); }
  });

  const lockAll = useCallback(() => { setNote(""); setOpened(null); setUnlockId(null); setAdding(false); setEntries(null); }, []);

  const remove = (id: string) => guard(async () => {
    await api(`/api/admin/vault/${id}`, { method: "DELETE" });
    setEntries((list) => list && list.filter((e) => e.id !== id));
    setOpened((o) => (o?.id === id ? null : o));
  });

  /** Downloads every entry exactly as stored (still encrypted). Nothing is decrypted to make it. */
  function downloadBackup() {
    if (!entries || entries.length === 0) return;
    const url = URL.createObjectURL(new Blob([makeBackup(entries.map((e) => e.payload))], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    setNote("Backup downloaded. It is encrypted, so it opens only with your passphrases. Keep it somewhere safe.");
  }

  /** Reads a backup file and uploads the entries that are not already in the vault. */
  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !entries) return;
    setNote("");
    setError("");
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) { setError(parsed.error); return; }
    const have = new Set(entries.map((x) => x.payload));
    const todo = parsed.payloads.filter((p, i, all) => !have.has(p) && all.indexOf(p) === i);
    const skipped = parsed.payloads.length - todo.length;
    if (entries.length + todo.length > max) { setError(`The vault holds up to ${max} entries, so this backup does not fit.`); return; }
    const done = new Set<string>(); // survives a step-up retry, so nothing is uploaded twice
    await guard(async () => {
      for (const payload of todo) {
        if (done.has(payload)) continue;
        const r = await api<{ id: string }>("/api/admin/vault", { method: "POST", body: JSON.stringify({ payload }) });
        done.add(payload);
        setEntries((list) => [...(list ?? []), { id: r.id, payload, createdAt: new Date().toISOString() }]);
      }
      setNote(`Imported ${done.size} entr${done.size === 1 ? "y" : "ies"}. ${skipped} already in the vault${parsed.invalid ? `, ${parsed.invalid} not valid and left out` : ""}.`);
    });
  }

  return (
    <div className="space-y-5">
      <div role="note" className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
        <p className="font-medium">Zero-knowledge vault</p>
        <p className="mt-1 text-muted">Everything is encrypted in this browser before it is uploaded. Your passphrase is never sent or saved. <strong className="text-fg">If you lose a passphrase, that entry cannot be recovered by anyone, including me.</strong></p>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {note && <p role="status" className="text-sm text-emerald-400">{note}</p>}

      {entries === null ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-line text-accent"><Lock /></span>
          <p className="max-w-sm text-sm text-muted">The list is locked. Opening it needs a fresh authenticator code and is written to the audit log.</p>
          <button className={btnCls} onClick={() => void loadList()} disabled={busy}>{busy ? "Opening..." : "Open the vault"}</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">{entries.length} of {max} entries</p>
            <div className="flex gap-2">
              <button className={ghostCls} onClick={downloadBackup} disabled={entries.length === 0}>Download backup</button>
              <label className={`${ghostCls} cursor-pointer`}>Import backup<input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void importBackup(e)} /></label>
              <button className={ghostCls} onClick={lockAll}>Lock the list</button>
              <button className={btnCls} onClick={() => setAdding(true)} disabled={adding || entries.length >= max}>Add entry</button>
            </div>
          </div>

          {adding && (
            <AddForm
              onCancel={() => setAdding(false)}
              onSave={(payload) => guard(async () => {
                const r = await api<{ id: string }>("/api/admin/vault", { method: "POST", body: JSON.stringify({ payload }) });
                setEntries((list) => [...(list ?? []), { id: r.id, payload, createdAt: new Date().toISOString() }]);
                setAdding(false);
              })}
            />
          )}

          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-2xl border border-line bg-surface p-4">
                {opened?.id === e.id ? (
                  <Revealed secret={opened.secret} onClose={() => setOpened(null)} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted"><Lock /></span>
                        <span>
                          <span className="block font-medium">Encrypted entry</span>
                          <span className="block text-xs text-muted">added {new Date(e.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                        </span>
                      </span>
                      <span className="flex gap-2">
                        <button className={ghostCls} onClick={() => setUnlockId(unlockId === e.id ? null : e.id)} aria-expanded={unlockId === e.id}>Unlock</button>
                        <DeleteButton onConfirm={() => void remove(e.id)} />
                      </span>
                    </div>
                    {unlockId === e.id && (
                      <UnlockForm
                        payload={e.payload}
                        onOpened={(secret) => { setOpened({ id: e.id, secret }); setUnlockId(null); }}
                        onCancel={() => setUnlockId(null)}
                      />
                    )}
                  </>
                )}
              </li>
            ))}
            {entries.length === 0 && <li className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Nothing here yet. Add your first .env file.</li>}
          </ul>
        </>
      )}

      <StepUpDialog open={pending !== null} onClose={() => setPending(null)} onSuccess={() => { const f = pending; setPending(null); f?.(); }} />
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [sure, setSure] = useState(false);
  if (!sure) return <button className={ghostCls} onClick={() => setSure(true)}>Delete</button>;
  return (
    <span className="flex gap-2">
      <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white" onClick={onConfirm}>Yes, delete forever</button>
      <button className={ghostCls} onClick={() => setSure(false)}>Keep</button>
    </span>
  );
}

function UnlockForm({ payload, onOpened, onCancel }: { payload: string; onOpened: (s: VaultSecret) => void; onCancel: () => void }) {
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pass) return;
    setBusy(true);
    setMsg("");
    try {
      const secret = await openSecret(pass, payload);
      setPass(""); // the passphrase is not kept after it has been used
      onOpened(secret);
    } catch (err) {
      setMsg(err instanceof VaultCryptoError ? "That passphrase does not open this entry." : "Could not open this entry.");
      setPass("");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-start gap-2">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Passphrase for this entry</span>
        <input autoFocus type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passphrase for this entry" className={inputCls} />
      </label>
      <button className={btnCls} disabled={busy || !pass}>{busy ? "Decrypting..." : "Reveal"}</button>
      <button type="button" className={ghostCls} onClick={onCancel}>Cancel</button>
      {msg && <p role="alert" className="w-full text-sm text-red-400">{msg}</p>}
    </form>
  );
}

/** Shows the decrypted entry. It hides itself after 30 s and the moment the tab loses focus. */
function Revealed({ secret, onClose }: { secret: VaultSecret; onClose: () => void }) {
  const [left, setLeft] = useState(REVEAL_SECONDS);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState("");
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const tick = setInterval(() => setLeft((s) => s - 1), 1000);
    const hide = () => closeRef.current();
    const onVis = () => { if (document.hidden) hide(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", hide);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("blur", hide); };
  }, []);
  useEffect(() => { if (left <= 0) closeRef.current(); }, [left]);
  // Wipe the clipboard if we copied something, even when the entry closes early.
  useEffect(() => () => { if (clipTimer.current) { clearTimeout(clipTimer.current); void navigator.clipboard?.writeText("").catch(() => {}); } }, []);

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      if (clipTimer.current) clearTimeout(clipTimer.current);
      clipTimer.current = setTimeout(() => { void navigator.clipboard.writeText("").catch(() => {}); clipTimer.current = null; setCopied(""); }, CLIPBOARD_CLEAR_MS);
    } catch { setCopied("Copy was blocked by the browser"); }
  }

  const lines = parseEnv(secret.content);
  const toggle = (i: number) => setShown((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-accent text-accent"><Lock open /></span>
          <div>
            <p className="font-medium">{secret.label || "Untitled"}</p>
            {secret.project && <p className="text-xs text-muted">{secret.project}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted" aria-live="off">hides in {Math.max(left, 0)}s</span>
          <button className={ghostCls} onClick={() => void copy(secret.content, "everything")}>Copy all</button>
          <button className={btnCls} onClick={onClose}>Hide now</button>
        </div>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true"><div className="h-full bg-accent transition-all duration-1000 ease-linear" style={{ width: `${(Math.max(left, 0) / REVEAL_SECONDS) * 100}%` }} /></div>
      <ul className="mt-4 space-y-1 font-mono text-sm">
        {lines.map((l, i) => l.kind === "text" ? (
          <li key={i} className="whitespace-pre-wrap break-all px-2 text-muted">{l.text || " "}</li>
        ) : (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-bg px-2 py-1.5">
            <span className="text-accent">{l.key}</span><span className="text-muted">=</span>
            <span className="min-w-0 flex-1 break-all" data-testid={`value-${l.key}`}>{shown.has(i) ? l.value : MASK}</span>
            <button className="text-xs text-muted underline hover:text-fg" onClick={() => toggle(i)} aria-label={`${shown.has(i) ? "Hide" : "Show"} ${l.key}`}>{shown.has(i) ? "hide" : "show"}</button>
            <button className="text-xs text-muted underline hover:text-fg" onClick={() => void copy(l.value, l.key)} aria-label={`Copy ${l.key}`}>copy</button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted" role="status">{copied ? (copied.startsWith("Copy was") ? copied : `Copied ${copied}. The clipboard is wiped in ${CLIPBOARD_CLEAR_MS / 1000}s.`) : " "}</p>
    </div>
  );
}

function AddForm({ onSave, onCancel }: { onSave: (payload: string) => Promise<void>; onCancel: () => void }) {
  const [label, setLabel] = useState("");
  const [project, setProject] = useState("");
  const [content, setContent] = useState("");
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const strength = passphraseStrength(pass);
  const canSave = label.trim() && content.trim() && strength.ok && pass === again && understood && !busy;

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_CONTENT_CHARS * 4) { setMsg("That file is too big for the vault."); return; }
    setContent(await f.text());
    if (!label) setLabel(f.name);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (content.length > MAX_CONTENT_CHARS) { setMsg(`Too long: the vault keeps up to ${MAX_CONTENT_CHARS.toLocaleString()} characters per entry.`); return; }
    setBusy(true);
    try {
      const payload = await sealSecret(pass, { label, project, content });
      if (payload.length > MAX_VAULT_PAYLOAD_CHARS) { setMsg("That entry is too big once encrypted. Split it into two."); return; }
      await onSave(payload);
      setPass(""); setAgain(""); setContent("");
    } catch { setMsg("Could not encrypt this entry."); } finally { setBusy(false); }
  }

  const bars = [1, 2, 3, 4];
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-accent/50 bg-surface p-5">
      <h2 className="text-lg font-semibold">Add an entry</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Name<input className={`${inputCls} mt-1`} value={label} onChange={(e) => setLabel(e.target.value.slice(0, MAX_LABEL_CHARS))} placeholder="e.g. Render production" required /></label>
        <label className="block text-sm">Project (optional)<input className={`${inputCls} mt-1`} value={project} onChange={(e) => setProject(e.target.value.slice(0, MAX_LABEL_CHARS))} placeholder="e.g. VHQ" /></label>
      </div>
      <label className="block text-sm">Paste your .env text, or choose a file
        <textarea className={`${inputCls} mt-1 min-h-32 font-mono text-sm`} value={content} onChange={(e) => setContent(e.target.value)} placeholder={"KEY=value\nOTHER_KEY=value"} spellCheck={false} autoComplete="off" required />
      </label>
      <label className="block text-sm"><span className="sr-only">Choose a .env file</span><input type="file" onChange={pickFile} className="text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-bg file:px-3 file:py-1.5 file:text-fg" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Passphrase<input type="password" autoComplete="new-password" className={`${inputCls} mt-1`} value={pass} onChange={(e) => setPass(e.target.value)} required /></label>
        <label className="block text-sm">Type it again<input type="password" autoComplete="new-password" className={`${inputCls} mt-1`} value={again} onChange={(e) => setAgain(e.target.value)} required /></label>
      </div>
      {pass && (
        <div aria-live="polite">
          <div className="flex gap-1" aria-hidden="true">{bars.map((b) => <span key={b} className={`h-1.5 flex-1 rounded-full ${strength.score >= b ? (strength.score >= 3 ? "bg-emerald-400" : strength.score === 2 ? "bg-amber-400" : "bg-red-400") : "bg-surface-strong"}`} />)}</div>
          <p className="mt-1 text-xs text-muted">Strength: {strength.label}. Several random words in a row make a strong passphrase.</p>
        </div>
      )}
      {again && pass !== again && <p role="alert" className="text-sm text-red-400">The two passphrases are different.</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} /><span>I understand that if I lose this passphrase, this entry can never be recovered.</span></label>
      {msg && <p role="alert" className="text-sm text-red-400">{msg}</p>}
      <div className="flex gap-2">
        <button className={btnCls} disabled={!canSave}>{busy ? "Encrypting..." : "Encrypt and save"}</button>
        <button type="button" className={ghostCls} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
