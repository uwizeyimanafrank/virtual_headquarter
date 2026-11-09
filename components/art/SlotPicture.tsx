import { thumb } from "@/lib/media";
import type { ResolvedSlot } from "@/lib/image-slots";

const WIDTHS = [480, 800, 1200, 1600, 2000];

export type PictureProps = {
  slot: ResolvedSlot;
  /** How wide it shows on screen, for the browser to pick a file size. Default: full width. */
  sizes?: string;
  /** True for the picture at the very top of a page (loads first). */
  priority?: boolean;
  className?: string;
  /** "ratio" keeps the slot's shape; "fill" covers its parent (backgrounds). */
  mode?: "ratio" | "fill";
};

/**
 * Shows one image slot: the owner's picture or the default. Responsive file sizes, a blurred
 * placeholder while it loads, the focal point kept in every crop, no layout shift, and the right
 * alt text (decorative pictures are hidden from screen readers).
 */
export function SlotPicture({ slot, sizes = "100vw", priority = false, className = "", mode = "ratio" }: PictureProps) {
  const remote = slot.src.startsWith("https://res.cloudinary.com/"); // check:images-ignore (decides whether Cloudinary can resize it)
  const focal = `${slot.focal.x}% ${slot.focal.y}%`;
  const baseW = 1600;
  const box = mode === "fill" ? "absolute inset-0 h-full w-full" : "relative w-full";
  return (
    <div
      data-slot={slot.key}
      className={`${box} overflow-hidden bg-[#0b1020] ${className}`}
      style={{
        ...(mode === "ratio" ? { aspectRatio: String(slot.ratio) } : {}),
        ...(remote ? { backgroundImage: `url(${thumb(slot.src, 24)})`, backgroundSize: "cover", backgroundPosition: focal } : {}),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={remote ? thumb(slot.src, 1200) : slot.src}
        srcSet={remote ? WIDTHS.map((w) => `${thumb(slot.src, w)} ${w}w`).join(", ") : undefined}
        sizes={remote ? sizes : undefined}
        alt={slot.decorative ? "" : slot.alt}
        aria-hidden={slot.decorative ? true : undefined}
        width={baseW}
        height={Math.round(baseW / slot.ratio)}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-cover"
        style={{ objectPosition: focal }}
      />
    </div>
  );
}

