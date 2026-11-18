"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isDataSaver, posterUrl } from "@/lib/video";

/**
 * The video of a piece. Nothing is downloaded until Play is pressed: before that there is only a still picture (if there is one).
 * After Play it starts with controls; it pauses when the tab is hidden, and it disappears (so it stops) when the piece changes or the panel closes.
 */
export function CaseVideo({ src, title }: { src: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  // The server and first paint say "no"; the browser then answers from its own connection information.
  const saver = useSyncExternalStore(() => () => {}, () => isDataSaver((navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection), () => false);
  const poster = posterUrl(src);

  useEffect(() => {
    if (!playing) return;
    const pause = () => { if (document.hidden) document.querySelector<HTMLVideoElement>("video[data-case-video]")?.pause(); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [playing]);

  if (playing) return <video data-case-video src={src} controls autoPlay playsInline preload="auto" poster={poster ?? undefined} className="w-full rounded-2xl bg-black" aria-label={`Video: ${title}`} />;
  return (
    <div>
      <button type="button" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`} className="relative block w-full overflow-hidden rounded-2xl border border-line bg-surface-strong">
        {poster ? (
          // Cloudinary still frame, made from an address checked when saved.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="block aspect-video w-full" />
        )}
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-bg/80 text-xl backdrop-blur">▶</span></span>
      </button>
      {saver && <p className="mt-1 text-xs text-muted">Data saver is on, so the video loads only when you press play.</p>}
    </div>
  );
}
