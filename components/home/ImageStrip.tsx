import { thumb } from "@/lib/media";

/** A slow strip of small pictures that drifts sideways (pauses on hover, still for reduced motion). Decorative. */
export function ImageStrip({ images, direction }: { images: readonly string[]; direction: "left" | "right" }) {
  if (images.length === 0) return null;
  const loop = [...images, ...images]; // twice, so the movement can repeat without a gap
  return (
    <div aria-hidden="true" data-dir={direction} className="strip my-4">
      <div className="strip-track">
        {loop.map((src, i) => (
          // The pictures come from the owner's items or our drawn scenes, never typed here.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={thumb(src, 320)} alt="" width={224} height={140} loading="lazy" decoding="async" draggable={false} className="h-[8.75rem] w-56 shrink-0 rounded-xl border border-line object-cover opacity-70" />
        ))}
      </div>
    </div>
  );
}
