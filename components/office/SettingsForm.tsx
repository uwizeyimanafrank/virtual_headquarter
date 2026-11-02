"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { SettingsView } from "@/lib/admin-settings";
import { Uploader } from "@/components/office/Uploader";

const input = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-sm text-muted";

/** Edit your profile and the wording of the public site, no code needed. */
export function SettingsForm({ initial }: { initial: SettingsView }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const setProfile = (k: keyof SettingsView["profile"], v: string) => setS({ ...s, profile: { ...s.profile, [k]: v } });
  const setChapter = (k: keyof SettingsView["chapterTitles"], v: string) => setS({ ...s, chapterTitles: { ...s.chapterTitles, [k]: v } });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(""); setErrors([]);
    try {
      const r = await api<SettingsView>("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ heroTitle: s.heroTitle, heroText: s.heroText, twinAvatarUrl: s.twinAvatarUrl, chapterTitles: s.chapterTitles, profile: s.profile }) });
      setS(r);
      setMsg("Saved.");
    } catch (err) {
      const issues = err instanceof ApiError ? (err.data as { issues?: { path: string; message: string }[] } | null)?.issues : undefined;
      setErrors(issues?.length ? issues.map((i) => `${i.path}: ${i.message}`) : [err instanceof ApiError ? err.message : "Something went wrong."]);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-8">
      {s.profileIsSample && <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">Some profile fields still show sample text. Replace them with your own.</p>}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <div><p className={label}>Photo</p><Uploader folder="profile" value={s.profile.photoUrl} onChange={(u) => setProfile("photoUrl", u)} /></div>
        <div><label className={label} htmlFor="name">Name</label><input id="name" className={input} value={s.profile.name} onChange={(e) => setProfile("name", e.target.value)} maxLength={80} /></div>
        <div><label className={label} htmlFor="tagline">Tagline</label><input id="tagline" className={input} value={s.profile.tagline} onChange={(e) => setProfile("tagline", e.target.value)} maxLength={160} /></div>
        <div><label className={label} htmlFor="bio">Short bio</label><textarea id="bio" className={`${input} min-h-28`} value={s.profile.bio} onChange={(e) => setProfile("bio", e.target.value)} maxLength={2000} /></div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">AI Twin picture</h2>
        <p className="text-sm text-muted">The round picture of your assistant in the corner of the Office. Leave empty to use the default.</p>
        <Uploader folder="profile" value={s.twinAvatarUrl} onChange={(u) => setS({ ...s, twinAvatarUrl: u })} />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Home page wording</h2>
        <div><label className={label} htmlFor="ht">Headline</label><input id="ht" className={input} value={s.heroTitle} onChange={(e) => setS({ ...s, heroTitle: e.target.value })} maxLength={160} /></div>
        <div><label className={label} htmlFor="hx">Welcome text</label><textarea id="hx" className={`${input} min-h-24`} value={s.heroText} onChange={(e) => setS({ ...s, heroText: e.target.value })} maxLength={600} /></div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Museum chapter titles</h2>
        {(["about", "certificates", "projects", "library"] as const).map((k) => (
          <div key={k}><label className={label} htmlFor={`c-${k}`}>{k === "library" ? "Books and references" : k[0].toUpperCase() + k.slice(1)}</label><input id={`c-${k}`} className={input} value={s.chapterTitles[k]} onChange={(e) => setChapter(k, e.target.value)} maxLength={80} /></div>
        ))}
      </section>
      {errors.length > 0 && <ul role="alert" className="space-y-1 text-sm text-red-400">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
      <div className="flex items-center gap-3">
        <button disabled={busy} className="rounded-xl bg-accent px-5 py-2 font-medium text-bg disabled:opacity-50">{busy ? "Saving..." : "Save settings"}</button>
        {msg && <p role="status" className="text-sm text-accent">{msg}</p>}
      </div>
    </form>
  );
}
