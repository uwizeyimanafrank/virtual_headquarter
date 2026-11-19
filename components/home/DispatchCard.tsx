import { posterUrl } from "@/lib/video";
import { thumb } from "@/lib/media";
import { KIND_LABELS, formatDispatchDate } from "@/lib/dispatches";
import type { PublicDispatch } from "@/lib/dispatches-public";

/** One dispatch as a card. Used on Home and on /dispatches. Text is always plain text. */
export function DispatchCard({ d }: { d: PublicDispatch }) {
  const picture = d.imageUrl ? thumb(d.imageUrl, 640) : d.video ? posterUrl(d.video, 640) : null;
  return (
    <article id={`d-${d.id}`} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      {picture
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={picture} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
        : null}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wider text-muted">
          <span className="text-accent">{KIND_LABELS[d.kind]}</span> · <time dateTime={d.date}>{formatDispatchDate(d.date)}</time>
          {d.pinned && <span className="ml-2" title="Pinned">📌</span>}
          {d.video && <span className="ml-2">· Video</span>}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug">{d.title}</h3>
        {d.text && <p className="mt-1 text-sm text-muted">{d.text}</p>}
      </div>
    </article>
  );
}
