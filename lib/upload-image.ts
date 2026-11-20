import { api } from "@/lib/api";
import { stripLocation } from "@/lib/strip-location";

export type UploadFolder = "project" | "certificate" | "story" | "book" | "reference" | "profile" | "slot" | "dispatch" | "gallery";
type Sign = { cloudName: string; apiKey: string; timestamp: number; folder: string; allowedFormats: string; signature: string };

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * One picture, straight to Cloudinary: checks it, removes hidden location data on this device, asks the server for a signature, uploads.
 * The server only hands out a signature; the secret never reaches the browser. Throws an Error with a message fit to show.
 */
export async function uploadImage(file: File, folder: UploadFolder, onProgress?: (percent: number) => void): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Please choose a JPG, PNG, WebP, GIF or AVIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is bigger than 8 MB. Please shrink it first.");
  // Hidden data (GPS place, camera, time) is removed here, before the file leaves this device. Needs no server and cannot be skipped by the API.
  const stripped = stripLocation(new Uint8Array(await file.arrayBuffer()));
  if (!stripped.cleaned && folder === "gallery") throw new Error("Gallery pictures must be JPG, PNG or WebP, so their hidden location data can be removed. Please convert it first.");
  const toSend = stripped.cleaned ? new File([stripped.bytes as BlobPart], file.name, { type: file.type }) : file;

  const sign = await api<Sign>("/api/admin/upload-sign", { method: "POST", body: JSON.stringify({ folder }) });
  const form = new FormData();
  form.append("file", toSend);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("folder", sign.folder);
  form.append("allowed_formats", sign.allowedFormats);
  form.append("signature", sign.signature);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloudName)}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText) as { secure_url?: string; error?: { message?: string } };
        if (xhr.status >= 200 && xhr.status < 300 && r.secure_url?.startsWith("https://res.cloudinary.com/")) resolve(r.secure_url);
        else reject(new Error(r.error?.message ?? "Cloudinary refused the upload."));
      } catch { reject(new Error("Unexpected answer from Cloudinary.")); }
    };
    xhr.send(form);
  });
}
