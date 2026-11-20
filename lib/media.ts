/**
 * Smaller, faster images from Cloudinary: asks it to resize and pick the best format.
 * Bundled /samples/ images and anything else are returned unchanged.
 */
export function thumb(url: string, width: number): string {
  const marker = "/image/upload/";
  if (!url.startsWith("https://res.cloudinary.com/") || !url.includes(marker)) return url;
  return url.replace(marker, `${marker}f_auto,q_auto,w_${Math.round(width)},c_limit/`);
}

const CLD = "https://res.cloudinary.com/";
const MARKER = "/image/upload/";

/**
 * The three sizes a gallery picture is shown at. The raw stored link is NEVER given to visitors:
 * every delivered size goes through a Cloudinary transformation, which also leaves out hidden metadata.
 * src = wall size, full = lightbox size, blur = a 24px blurred preview used as the placeholder ("" when it cannot be made).
 */
export function photoUrls(url: string): { src: string; full: string; blur: string } {
  const cloud = url.startsWith(CLD) && url.includes(MARKER);
  return { src: thumb(url, 640), full: thumb(url, 1600), blur: cloud ? url.replace(MARKER, `${MARKER}f_auto,q_auto:low,w_24,c_limit,e_blur:300/`) : "" };
}
