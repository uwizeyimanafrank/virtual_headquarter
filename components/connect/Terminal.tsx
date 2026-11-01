"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Phase = "idle" | "sending" | "sent" | "error";

const MAX_MESSAGE = 2000;
const field = "w-full rounded-lg border border-line bg-bg/60 px-3 py-2 font-mono text-sm text-fg outline-none placeholder:text-muted/70 focus:border-accent";

/** What the visitor reads for each kind of failure. Server wording is never shown, so nothing leaks. */
function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return "You have sent a few messages already. Please try again a little later.";
    if (e.status === 400) return "Something in the form does not look right. Please check your name, email and message.";
  }
  return "The message could not be sent right now. Please try again in a moment.";
}

/**
 * The contact form, styled as a small terminal. Posts to POST /api/connect, which is the real gatekeeper
 * (validation, spam trap, rate limit). The hidden field `website` is a trap for bots: people never see it.
 */
export function ConnectTerminal() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState(""); // honeypot: stays empty for real people
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const sending = useRef(false); // blocks a second submit before React re-renders

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setPhase("sending");
    setError("");
    try {
      await api("/api/connect", { method: "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), website: trap }) });
      setName(""); setEmail(""); setMessage(""); setTrap("");
      setPhase("sent");
    } catch (err) {
      setError(friendlyError(err));
      setPhase("error");
    } finally {
      sending.current = false;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3" aria-hidden>
        <span className="h-3 w-3 rounded-full bg-red-400/70" /><span className="h-3 w-3 rounded-full bg-amber-400/70" /><span className="h-3 w-3 rounded-full bg-emerald-400/70" />
        <span className="ml-3 font-mono text-xs text-muted">message-terminal</span>
      </div>

      {phase === "sent" ? (
        <div className="space-y-4 p-6 font-mono text-sm" role="status" tabIndex={-1}>
          <p className="text-accent">$ message sent</p>
          <p>Message received. Thank you. I read every one.</p>
          <button type="button" onClick={() => setPhase("idle")} className="rounded-lg border border-line px-4 py-2 hover:bg-surface-strong">Send another</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5 p-6" noValidate={false}>
          <p className="font-mono text-sm text-muted">$ Sit down. Tell me who you are and what is on your mind.</p>

          <div>
            <label htmlFor="c-name" className="mb-1 block font-mono text-xs text-accent">$ name</label>
            <input id="c-name" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoComplete="name" placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="c-email" className="mb-1 block font-mono text-xs text-accent">$ email</label>
            <input id="c-email" type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} required autoComplete="email" placeholder="So I can answer you" />
          </div>
          <div>
            <label htmlFor="c-message" className="mb-1 flex justify-between font-mono text-xs text-accent">
              <span>$ message</span>
              <span className="text-muted" aria-live="off">{message.length}/{MAX_MESSAGE}</span>
            </label>
            <textarea id="c-message" className={`${field} min-h-36 resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={MAX_MESSAGE} required placeholder="Write it here" />
          </div>

          {/* Bot trap: off-screen, skipped by keyboard and screen readers. Real visitors never fill it. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="c-website">Leave this empty</label>
            <input id="c-website" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </div>

          {phase === "error" && <p role="alert" className="font-mono text-sm text-red-400">{error}</p>}

          <button disabled={phase === "sending"} className="rounded-xl bg-accent px-6 py-3 font-semibold text-bg transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
            {phase === "sending" ? "Sending..." : "Send message"}
          </button>
          <p className="font-mono text-xs text-muted">Your message goes straight to my private inbox. Nothing is published.</p>
        </form>
      )}
    </div>
  );
}
