import { thumb } from "@/lib/media";
import type { HomeData } from "@/lib/home";

/** The welcome panel. All wording comes from your settings. */
export function Hero({ data }: { data: HomeData }) {
  const { profile } = data;
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-8 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-12">
      {(profile.name || profile.photoUrl) && (
        <div className="mb-8 flex items-center gap-4">
          {profile.photoUrl && (
            // Cloudinary or bundled sample only (checked when saved). Small and lazy-safe.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb(profile.photoUrl, 160)} alt={profile.name ? `Photo of ${profile.name}` : "Profile photo"} width={64} height={64} className="h-16 w-16 rounded-full border border-line object-cover" />
          )}
          <div>
            {profile.name && <p className="font-medium">{profile.name}</p>}
            {profile.tagline && <p className="text-sm text-muted">{profile.tagline}</p>}
          </div>
        </div>
      )}
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">Personal Virtual Headquarters</p>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">{data.heroTitle}</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">{data.heroText}</p>
      <p className="mt-8 border-l-2 border-accent pl-4 text-fg">
        Consider this an open invitation: a free tour of the work, no tickets, no guide talking over it. Step into the Museum when you are ready.
      </p>
    </div>
  );
}
