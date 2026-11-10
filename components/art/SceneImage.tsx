import { getSlot } from "@/lib/slots";
import { ART_SVG } from "@/lib/art-data.generated";
import { Scene } from "@/components/art/Scene";
import { SlotPicture } from "@/components/art/SlotPicture";

type Props = { slot: string; sizes?: string; priority?: boolean; className?: string; animate?: boolean; parallax?: boolean };

/**
 * A slot that shows a moving drawn scene while the default art is in place, and the owner's own picture
 * (a normal still image) as soon as they replace it in the Office. Unknown slots show nothing.
 */
export async function SceneImage({ slot: key, sizes, priority, className = "", animate, parallax }: Props) {
  const slot = await getSlot(key);
  if (!slot) {
    console.error(`SceneImage: no image slot named "${key}". Add it to lib/image-slots.ts.`);
    return null;
  }
  const svg = !slot.custom ? ART_SVG[slot.src] : undefined;
  if (!svg) return <SlotPicture slot={slot} sizes={sizes} priority={priority} className={className} mode="fill" />;
  return (
    <div data-slot={slot.key} className={`absolute inset-0 ${className}`} style={{ ["--focal" as string]: `${slot.focal.x}% ${slot.focal.y}%` }}>
      <Scene svg={svg} className="h-full w-full" animate={animate} parallax={parallax} />
    </div>
  );
}
