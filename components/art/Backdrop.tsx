import { SceneImage } from "@/components/art/SceneImage";

/**
 * The picture behind the header of a public page (an image slot, so the owner can replace or clear it in the Office).
 * A gradient fades it into the page so the title stays readable. Decorative. Put it first inside a `relative isolate` element.
 */
export function Backdrop({ slot, className = "h-[28rem]" }: { slot: string; className?: string }) {
  return (
    <div aria-hidden="true" data-backdrop={slot} className={`pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden ${className}`}>
      <SceneImage slot={slot} parallax={false} />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/70 to-bg" />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_50%_0%,rgba(45,212,191,0.14),transparent_60%)]" />
    </div>
  );
}
