"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { HIRE_KINDS, HIRE_KIND_LABELS, type HireKind } from "@/lib/hire-kinds";
import { parseLinks } from "@/lib/hire-links";

type Phase = "idle" | "sending" | "sent" | "error";
const MAX_MESSAGE = 3000;
const field = "w-full rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted/70 focus:border-accent";
const label = "mb-1 block text-sm font-medium";

/** What the visitor reads for each kind of failure. Server wording is never shown, so nothing leaks. */
function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return "You have sent a few requests already. Please try again a little later.";
    if (e.status === 400) return "Something in the form does not look right. Please check your email, your message (at least 10 characters) and your links.";
  }
  return "Your request could not be sent right now. Please try again in a moment.";
}

/** The hire request form. Posts to POST /api/hire, which is the real gatekeeper (validation, spam trap, rate limit). */
export function HireForm() {
  const [v, setV] = useState({ name: "", email: "", company: "", kind: "project" as HireKind, budget: "", timeline: "", message: "", links: "", website: "" });
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const sending = useRef(false); // blocks a second submit before React re-renders
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setPhase("sending"); setError("");
    try {
      await api("/api/hire", { method: "POST", body: JSON.stringify({
        name: v.name.trim(), email: v.email.trim(), company: v.company.trim(), kind: v.kind, budget: v.budget.trim(), timeline: v.timeline.trim(),
        message: v.message.trim(), links: parseLinks(v.links), website: v.website,
      }) });
      setV({ name: "", email: "", company: "", kind: "project", budget: "", timeline: "", message: "", links: "", website: "" });
      setPhase("sent");
    } catch (err) {
      setError(friendlyError(err)); setPhase("error");
    } finally { sending.current = false; }
  }

  if (phase === "sent") {
    return (
      <div role="status" tabIndex={-1} className="rounded-2xl border border-line bg-surface p-8 text-center">
        <h3 className="text-xl font-semibold text-accent">Request received</h3>
        <p className="mt-2 text-muted">Thank you. I read every request and answer personally.</p>
        <button type="button" onClick={() => setPhase("idle")} className="mt-5 rounded-lg border border-line px-4 py-2 text-sm hover:bg-surface-strong">Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="h-name" className={label}>Your name</label><input id="h-name" className={field} value={v.name} onChange={set("name")} maxLength={80} required autoComplete="name" /></div>
        <div><label htmlFor="h-email" className={label}>Email</label><input id="h-email" type="email" className={field} value={v.email} onChange={set("email")} maxLength={160} required autoComplete="email" /></div>
      </div>
      <div><label htmlFor="h-company" className={label}>Company or organisation <span className="font-normal text-muted">(optional)</span></label><input id="h-company" className={field} value={v.company} onChange={set("company")} maxLength={120} autoComplete="organization" /></div>
      <fieldset>
        <legend className={label}>What kind of work is it?</legend>
        <div className="flex flex-wrap gap-2">
          {HIRE_KINDS.map((k) => (
            <label key={k} className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${v.kind === k ? "border-accent text-accent" : "border-line text-muted hover:text-fg"}`}>
              <input type="radio" name="kind" value={k} checked={v.kind === k} onChange={() => setV((x) => ({ ...x, kind: k }))} className="sr-only" />{HIRE_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="h-budget" className={label}>Budget range <span className="font-normal text-muted">(optional)</span></label><input id="h-budget" className={field} value={v.budget} onChange={set("budget")} maxLength={80} placeholder="For example 500 to 1,000 USD" /></div>
        <div><label htmlFor="h-timeline" className={label}>Timeline <span className="font-normal text-muted">(optional)</span></label><input id="h-timeline" className={field} value={v.timeline} onChange={set("timeline")} maxLength={120} placeholder="For example, live by March" /></div>
      </div>
      <div>
        <label htmlFor="h-message" className={`${label} flex justify-between`}><span>What do you need?</span><span className="font-normal text-muted">{v.message.length}/{MAX_MESSAGE}</span></label>
        <textarea id="h-message" className={`${field} min-h-36 resize-y`} value={v.message} onChange={set("message")} maxLength={MAX_MESSAGE} required minLength={10} placeholder="The goal, who it is for, and anything that is already decided." />
      </div>
      <div><label htmlFor="h-links" className={label}>Links <span className="font-normal text-muted">(optional, one per line, up to 5)</span></label><textarea id="h-links" className={`${field} min-h-20 resize-y`} value={v.links} onChange={set("links")} maxLength={1000} placeholder={"your-site.com\nanother-link.com/page"} /></div>

      {/* Bot trap: off-screen, skipped by keyboard and screen readers. Real visitors never fill it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="h-website">Leave this empty</label>
        <input id="h-website" name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>

      {phase === "error" && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button disabled={phase === "sending"} className="rounded-xl bg-accent px-6 py-3 font-medium text-bg hover:opacity-90 disabled:opacity-50">{phase === "sending" ? "Sending..." : "Send request"}</button>
      <p className="text-xs text-muted">Your details are saved privately and only used to reply to you. Nothing is shared and no email is sent automatically.</p>
    </form>
  );
}
