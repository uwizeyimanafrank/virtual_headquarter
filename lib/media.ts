/**
 * Smaller, faster images from Cloudinary: asks it to resize and pick the best format.
 * Bundled /samples/ images and anything else are returned unchanged.
 */
export function thumb(url: string, width: number): string {
  const marker = "/image/upload/";
  if (!url.startsWith("https://res.cloudinary.com/") || !url.includes(marker)) return url;
  return url.replace(marker, `${marker}f_auto,q_auto,w_${Math.round(width)},c_limit/`);
}
