import { getMuseumData } from "@/lib/museum";

/**
 * The Museum. This task (P05-T01) wires the data: published items arrive grouped
 * into chapters, ready for the two real layouts built next — the vertical timeline
 * (mobile, P05-T02) and the horizontal GSAP track (desktop, P05-T04). Until then a
 * simple accessible grid keeps every chapter readable on any screen.
 */
export default async function MuseumPage() {
  const data = await getMuseumData(); // cached; refreshed right after you edit content in the Office
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">The Museum</h1>
        <p className="mt-2 max-w-xl text-muted">
          A walk through the work and the person behind it — chapter by chapter.
        </p>
      </header>

      {data.chapters.map((chapter) => (
        <section key={chapter.key} aria-label={chapter.title} className="mb-12">
          <h2 className="mb-4 text-xl font-semibold text-accent">{chapter.title}</h2>
          {chapter.items.length === 0 ? (
            <p className="text-sm text-muted">Nothing in this chapter yet.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chapter.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-line bg-surface p-5 backdrop-blur-sm"
                >
                  <p className="font-mono text-xs text-muted">{item.date}</p>
                  <h3 className="mt-1 font-semibold">{item.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{item.description}</p>
                  {item.skills.length > 0 && (
                    <ul aria-label="Skills" className="mt-3 flex flex-wrap gap-1.5">
                      {item.skills.map((skill) => (
                        <li
                          key={skill}
                          className="rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
