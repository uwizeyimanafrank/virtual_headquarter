import "server-only";
import { ALLOWED_UPLOAD_FORMATS, cloudinaryClient } from "@/lib/cloudinary";
import { MIME, sniffImage } from "@/lib/image-sniff";
import { DownloadError, safeDownload } from "@/lib/services/net";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

export class ImportError extends Error {
  constructor(message: string) { super(message); this.name = "ImportError"; }
}

const SAY: Record<DownloadError["code"], string> = {
  BAD_URL: "That link does not work here. Use a full https:// link to the picture itself (without a username or password).",
  PRIVATE_ADDRESS: "That link points to a private or internal address, so it was refused.",
  TOO_BIG: "That picture is bigger than 8 MB. Pick a smaller one.",
  TIMEOUT: "The other site took too long to answer.",
  TOO_MANY_REDIRECTS: "That link jumps around too many times.",
  NETWORK: "Could not reach that link. Check it opens in your browser.",
};

export type Imported = { url: string; publicId: string; sourceUrl: string; host: string };

/**
 * Downloads a picture from a link and stores OUR copy in Cloudinary. We never show another site's
 * picture directly: it can vanish, slow the page down, track visitors, and may not be free to use.
 */
export async function importImage(link: string): Promise<Imported> {
  let file;
  try {
    file = await safeDownload(link.trim(), { maxBytes: MAX_IMPORT_BYTES });
  } catch (e) {
    if (e instanceof DownloadError) throw new ImportError(SAY[e.code]);
    throw new ImportError(SAY.NETWORK);
  }
  if (file.status < 200 || file.status >= 300) throw new ImportError(`That link answered with an error (${file.status}). Open it in your browser to check it.`);
  if (!file.contentType.startsWith("image/")) throw new ImportError("That link is not a picture (it is a web page or another kind of file). Right-click the picture and copy the image address.");
  const kind = sniffImage(file.body);
  if (!kind) throw new ImportError("That file is not a JPG, PNG, WebP, GIF or AVIF picture, so it was refused.");

  let client;
  try { client = cloudinaryClient(); } catch (e) { throw new ImportError(e instanceof Error ? e.message : "Cloudinary is not set up."); }
  let res;
  try {
    res = await client.uploader.upload(`data:${MIME[kind]};base64,${file.body.toString("base64")}`, {
      folder: "vhq/slot",
      resource_type: "image",
      allowed_formats: ALLOWED_UPLOAD_FORMATS.split(","),
    });
  } catch {
    throw new ImportError("Cloudinary refused the picture. Try another one.");
  }
  if (!res.secure_url?.startsWith("https://res.cloudinary.com/")) throw new ImportError("Cloudinary gave an unexpected answer.");
  return { url: res.secure_url, publicId: res.public_id, sourceUrl: file.finalUrl, host: new URL(file.finalUrl).hostname };
}
