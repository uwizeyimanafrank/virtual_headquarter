import { getSlot } from "@/lib/slots";
import { SlotPicture, type PictureProps } from "@/components/art/SlotPicture";

/** Server component: looks the slot up (owner's picture or default) and shows it. Unknown keys show nothing. */
export async function SlotImage({ slot: key, ...rest }: Omit<PictureProps, "slot"> & { slot: string }) {
  const slot = await getSlot(key);
  if (!slot) {
    console.error(`SlotImage: no image slot named "${key}". Add it to lib/image-slots.ts.`);
    return null;
  }
  return <SlotPicture slot={slot} {...rest} />;
}
