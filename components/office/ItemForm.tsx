"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { AdminItem } from "@/lib/admin-items";
import { SampleBadge } from "@/components/office/SampleBadge";
import { Uploader } from "@/components/office/Uploader";

const TYPES = ["project", "certificate", "story", "book", "reference"] as const;
type T = (typeof TYPES)[number];
const input = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-sm text-muted";

const LINK_LABEL: Record<T, string> = {
  project: "Link to the project (optional)",
  certificate: "Grade or verification link (optional)",
  story: "",
  book: "Link to the book (optional)",
  reference: "Link to the reference (optional)",
};

/** Create or edit a Museum item. Fields change with the type; the preview shows how it will look. */
export function ItemForm({ initial }: { initial?: AdminItem }) {
  const router = useRouter();
  const base = "/" + (usePathname().split("/")[1] ?? "");
  const [type, setType] = useState<T>((initial?.type as T) ?? "project");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 7));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mediaUrl, setMediaUrl] = useState(initial?.mediaUrl ?? "");
  const [speed, setSpeed] = useState(initial?.parallaxSpeed ?? 0.5);
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [link, setLink] = useState(initial?.metadata.gradeOrLink ?? "");
  const [skills, setSkills] = useState((initial?.metadata.skills ?? []).join(", "));
  const [story, setStory] = useState(initial?.metadata.howIEarnedIt ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
  const showSkills = type === "project" || type === "certificate";
  const storyLabel = type === "certificate" ? "How I earned it" : type === "project" ? "How I built it / what I learned" : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    const body = {
      type, title, description, mediaUrl, parallaxSpeed: speed, date, status,
      metadata: { gradeOrLink: LINK_LABEL[type] ? link : "", skills: showSkills ? skillList : [], howIEarnedIt: storyLabel ? story : "" },
    };
    try {
      if (initial) await api(`/api/admin/items/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/admin/items", { method: "POST", body: JSON.stringify(body) });
      router.push(`${base}/content`);
    } catch (err) {
      const issues = err instanceof ApiError ? (err.data as { issues?: { path: string; message: string }[] } | null)?.issues : undefined;
      setErrors(issues?.length ? issues.map((i) => `${i.path}: ${i.message}`) : [err instanceof ApiError ? err.message : "Something went wrong."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {initial?.isSample && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200"><SampleBadge /> This is sample content. Saving your changes turns it into your own item.</p>
        )}
        <div>
          <label className={label} htmlFor="type">Type</label>
          <select id="type" className={input} value={type} onChange={(e) => setType(e.target.value as T)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="title">Title</label>
          <input id="title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label className={label} htmlFor="date">Month</label>
          <input id="date" type="month" className={input} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className={label} htmlFor="desc">Description</label>
          <textarea id="desc" className={`${input} min-h-32`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
        </div>
        {storyLabel && (
          <div>
            <label className={label} htmlFor="story">{storyLabel}</label>
            <textarea id="story" className={`${input} min-h-24`} value={story} onChange={(e) => setStory(e.target.value)} maxLength={2000} />
          </div>
        )}
        {LINK_LABEL[type] && (
          <div>
            <label className={label} htmlFor="link">{LINK_LABEL[type]}</label>
            <input id="link" className={input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Starts with https://" />
          </div>
        )}
        {showSkills && (
          <div>
            <label className={label} htmlFor="skills">Skills (separate with commas)</label>
            <input id="skills" className={input} value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
        )}
        <div>
          <p className={label}>Image</p>
          <Uploader folder={type} value={mediaUrl} onChange={setMediaUrl} />
        </div>
        <div>
          <label className={label} htmlFor="speed">Floating speed in the Museum: {speed.toFixed(1)}</label>
          <input id="speed" type="range" min={0.1} max={1.5} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className={label} htmlFor="status">Status</label>
          <select id="status" className={input} value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">Draft (only you can see it)</option>
            <option value="published">Published (visible on the public site)</option>
          </select>
        </div>
        {errors.length > 0 && <ul role="alert" className="space-y-1 text-sm text-red-400">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
        <div className="flex gap-2">
          <button disabled={busy} className="rounded-xl bg-accent px-5 py-2 font-medium text-bg disabled:opacity-50">{busy ? "Saving..." : initial ? "Save changes" : "Create item"}</button>
          <button type="button" onClick={() => router.push(`${base}/content`)} className="rounded-xl border border-line px-5 py-2">Cancel</button>
        </div>
      </div>

      <aside aria-label="Preview" className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm text-muted">Preview</p>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface backdrop-blur">
          {mediaUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaUrl} alt="" className="h-44 w-full object-cover" />
            : <div className="flex h-44 items-center justify-center bg-surface-strong text-sm text-muted">No image</div>}
          <div className="space-y-2 p-4">
            <p className="text-xs uppercase tracking-wide text-accent">{type} &middot; {date}</p>
            <p className="text-lg font-semibold">{title || "Untitled"}</p>
            <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted">{description || "Your description appears here."}</p>
            {showSkills && skillList.length > 0 && <p className="flex flex-wrap gap-1">{skillList.map((s) => <span key={s} className="rounded-full border border-line px-2 py-0.5 text-xs">{s}</span>)}</p>}
            <p className="text-xs text-muted">{status === "published" ? "Visible on the public site" : "Draft: hidden from visitors"}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
