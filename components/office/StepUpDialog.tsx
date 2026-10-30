"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

/**
 * Asks for a fresh authenticator code before a sensitive action (vault, deleting, security changes).
 * Usage: <StepUpDialog open={open} onClose={...} onSuccess={() => retryTheAction()} />
 * Tip: when an admin API answers 401 with code "STEP_UP_REQUIRED", open this dialog.
 */
export function StepUpDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/stepup", { method: "POST", body: JSON.stringify({ code }) });
      setCode("");
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm it is you" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border border-line bg-bg p-5">
        <h2 className="text-lg font-semibold">Confirm it is you</h2>
        <p className="text-sm text-muted">Enter your authenticator code (or a recovery code) to continue.</p>
        <input autoFocus className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" required />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line px-4 py-2">Cancel</button>
          <button disabled={busy} className="flex-1 rounded-xl bg-accent px-4 py-2 font-medium text-bg disabled:opacity-50">{busy ? "Checking..." : "Confirm"}</button>
        </div>
      </form>
    </div>
  );
}
