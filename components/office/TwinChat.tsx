"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { hardNavigate } from "@/lib/nav";

type Turn = { role: "user" | "model"; text: string };
const MAX_TURNS_SENT = 10;
const IDEAS = ["How is my site doing?", "Help me write a project description", "What should I do next?"];

/** The chat window. Messages are shown as plain text only. The conversation lives in memory and is gone when you close the tab. */
export function TwinChat({ avatarUrl, onClose }: { avatarUrl: string; onClose: () => void }) {
  const base = "/" + (usePathname().split("/")[1] ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView?.({ block: "end" }); }, [turns, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const history = turns.slice(-MAX_TURNS_SENT);
    setTurns([...turns, { role: "user", text: message }]);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const r = await api<{ reply: string }>("/api/admin/ai", { method: "POST", body: JSON.stringify({ message, history }) });
      setTurns((t) => [...t, { role: "model", text: r.reply }]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return hardNavigate(`${base}/login`);
      setError(e instanceof ApiError ? e.message : "Could not reach the AI Twin. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="AI Twin chat"
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
      className="fixed inset-0 z-50 flex flex-col bg-bg md:inset-auto md:bottom-24 md:right-4 md:h-[34rem] md:w-96 md:rounded-2xl md:border md:border-line md:shadow-2xl md:shadow-black/40"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
        <div className="flex-1">
          <p className="text-sm font-medium">AI Twin</p>
          <p className="text-xs text-muted">Sees site numbers, never your secrets</p>
        </div>
        {turns.length > 0 && <button type="button" onClick={() => { setTurns([]); setError(""); }} className="rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong">Clear</button>}
        <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-lg border border-line px-2.5 py-1 text-xs hover:bg-surface-strong">Close</button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="space-y-3 text-sm text-muted">
            <p>Hey. Ask me about your site, or ask for help writing something.</p>
            <ul className="flex flex-wrap gap-2">{IDEAS.map((i) => <li key={i}><button type="button" onClick={() => void send(i)} className="rounded-full border border-line px-3 py-1.5 text-xs text-fg hover:bg-surface-strong">{i}</button></li>)}</ul>
          </div>
        )}
        {turns.map((t, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${t.role === "user" ? "ml-auto bg-accent text-bg" : "bg-surface-strong"}`}>
            <span className="sr-only">{t.role === "user" ? "You: " : "AI Twin: "}</span>{t.text}
          </p>
        ))}
        {busy && <p className="text-sm text-muted" role="status">Thinking...</p>}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div ref={end} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-end gap-2 border-t border-line p-3">
        <label htmlFor="twin-input" className="sr-only">Message</label>
        <textarea
          id="twin-input"
          autoFocus
          rows={1}
          value={input}
          maxLength={2000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(input); } }}
          placeholder="Ask something..."
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button disabled={busy || input.trim() === ""} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
