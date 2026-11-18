// Video rules for the Glass Cases panel (P12-T07). Pure helpers.

/** A still frame from a Cloudinary video, used as the poster so nothing heavy loads up front. Null for other addresses. */
export function posterUrl(video: string, width = 1000): string | null {
  const marker = "/video/upload/";
  if (!video.startsWith("https://res.cloudinary.com/") || !video.includes(marker)) return null;
  const withFrame = video.replace(marker, `${marker}so_0,f_jpg,q_auto,w_${Math.round(width)}/`);
  return withFrame.replace(/\.[a-z0-9]{2,5}(\?.*)?$/i, ".jpg$1");
}

type Connection = { saveData?: boolean; effectiveType?: string } | undefined;

/** True when the visitor asked for less data, or the connection is slow: say so, and never fetch the video before Play. */
export function isDataSaver(conn: Connection): boolean {
  if (!conn) return false;
  return conn.saveData === true || conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}
