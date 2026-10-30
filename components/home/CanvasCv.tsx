import type { HomeData, HomeItem } from "@/lib/home";
import { CvCard } from "@/components/home/CvCard";

const byTypeNewest = (items: HomeItem[], type: string) => items.filter((i) => i.type === type);

/**
 * The CV as floating cards. Nothing is hardcoded: it is built from your profile and your published
 * Museum items (certificates, projects, stories, skills), so adding content in the Office updates it.
 */
export function CanvasCv({ data }: { data: HomeData }) {
  const { profile, items, chapterTitles } = data;
  const certificates = byTypeNewest(items, "certificate").slice(0, 4);
  const projects = byTypeNewest(items, "project").slice(0, 4);

  // Skills, most used first.
  const counts = new Map<string, number>();
  for (const i of items) for (const s of i.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
  const skills = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14);

  // Trajectory: oldest to newest.
  const trajectory = [...items].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  const empty = <p className="text-sm text-muted">Nothing here yet. Add it from the Office.</p>;

  return (
    <div>
      <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-[0.3em] text-muted">Canvas CV</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <CvCard kicker="Profile" title={profile.name || "The person behind the work"} className="lg:col-span-3" delay={0}>
          {profile.tagline && <p className="mb-2 text-fg">{profile.tagline}</p>}
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{profile.bio || "Your short bio appears here once you write it in Settings."}</p>
        </CvCard>

        <CvCard kicker={chapterTitles.certificates} title="Credentials" className="lg:col-span-3 lg:mt-6" delay={0.6}>
          {certificates.length === 0 ? empty : (
            <ul className="space-y-2 text-sm">
              {certificates.map((c) => (
                <li key={c.id} className="flex justify-between gap-3"><span>{c.title}</span><span className="shrink-0 font-mono text-xs text-muted">{c.date}</span></li>
              ))}
            </ul>
          )}
        </CvCard>

        <CvCard kicker={chapterTitles.projects} title="Projects" className="lg:col-span-2" delay={1.2}>
          {projects.length === 0 ? empty : (
            <ul className="space-y-3 text-sm">
              {projects.map((p) => (
                <li key={p.id}>
                  <p className="font-medium">{p.title}</p>
                  {p.skills.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{p.skills.slice(0, 4).map((s) => <span key={s} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{s}</span>)}</p>}
                </li>
              ))}
            </ul>
          )}
        </CvCard>

        <CvCard kicker="Toolkit" title="Skills" className="lg:col-span-2 lg:mt-8" delay={1.8}>
          {skills.length === 0 ? <p className="text-sm text-muted">Add skills to your projects and they collect here.</p> : (
            <p className="flex flex-wrap gap-1.5">{skills.map(([s, n]) => <span key={s} className="rounded-full bg-surface-strong px-2.5 py-1 text-xs" title={`used in ${n} item${n === 1 ? "" : "s"}`}>{s}</span>)}</p>
          )}
        </CvCard>

        <CvCard kicker="Growth" title="Trajectory" className="lg:col-span-2" delay={2.4}>
          {trajectory.length === 0 ? empty : (
            <ol className="relative space-y-3 border-l border-line pl-4 text-sm">
              {trajectory.map((t) => (
                <li key={t.id} className="relative">
                  <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden />
                  <p className="font-mono text-xs text-muted">{t.date} &middot; {t.type}</p>
                  <p>{t.title}</p>
                </li>
              ))}
            </ol>
          )}
        </CvCard>
      </div>
    </div>
  );
}
