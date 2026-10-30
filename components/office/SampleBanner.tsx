"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StepUpDialog } from "@/components/office/StepUpDialog";

type Status = { total: number; visiblePublicly: number; showSamples: boolean; autoHideSamples: boolean };
type Action = { action: "show" | "hide" | "restore" | "delete" } | { action: "autohide"; value: boolean };

const btn = "rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-strong";

/** Warns when sample (fake) content exists or is visible on the public site, and lets you control it. */
export function SampleBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [stepUp, setStepUp] = useState<Action | null>(null);

  useEffect(() => {
    let alive = true;
    api<Status>("/api/admin/samples").then((s) => alive && setStatus(s)).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function run(a: Action) {
    setError("");
    try {
      setStatus(await api<Status>("/api/admin/samples", { method: "POST", body: JSON.stringify(a) }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setStepUp(a); // needs a fresh authenticator code first
      else setError(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  if (!status) return null;
  if (status.total === 0) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
        <p className="text-muted">No sample content. Want to see how the Museum looks with example items?</p>
        <button className={btn} onClick={() => run({ action: "restore" })}>Add sample content</button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">
      <p className="font-medium text-amber-200">
        {status.visiblePublicly > 0
          ? `${status.visiblePublicly} sample item${status.visiblePublicly === 1 ? " is" : "s are"} visible on your public site right now.`
          : "Sample content exists but is not visible on your public site."}
      </p>
      <p className="mt-1 text-muted">Samples are fake examples so the site never looks empty. Replace them with your real content, or remove them.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status.showSamples ? <button className={btn} onClick={() => run({ action: "hide" })}>Hide samples from public</button> : <button className={btn} onClick={() => run({ action: "show" })}>Show samples publicly</button>}
        <button className={btn} onClick={() => window.confirm("Delete ALL sample content? This cannot be undone.") && run({ action: "delete" })}>Delete all samples</button>
        <label className="ml-1 flex items-center gap-2 text-muted">
          <input type="checkbox" checked={status.autoHideSamples} onChange={(e) => run({ action: "autohide", value: e.target.checked })} />
          Hide samples of a type once I publish a real one
        </label>
      </div>
      {error && <p role="alert" className="mt-2 text-red-400">{error}</p>}
      <StepUpDialog open={stepUp !== null} onClose={() => setStepUp(null)} onSuccess={() => { const a = stepUp; setStepUp(null); if (a) void run(a); }} />
    </div>
  );
}
