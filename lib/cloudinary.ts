import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { requireEnv } from "@/lib/env";

/** Cloudinary client configured from the environment (throws a readable error if a value is missing). */
export function cloudinaryClient() {
  return configured();
}

function configured() {
  cloudinary.config({
    cloud_name: requireEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: requireEnv("CLOUDINARY_API_KEY"),
    api_secret: requireEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });
  return cloudinary;
}

/**
 * Signature for a direct browser upload to Cloudinary.
 * The API secret stays on the server: the browser only receives the signature.
 */
export const ALLOWED_UPLOAD_FORMATS = "jpg,jpeg,png,webp,gif,avif";

export function getUploadSignature(folder: string) {
  const c = configured();
  const timestamp = Math.round(Date.now() / 1000);
  // allowed_formats is part of the signed data, so the browser cannot change it to upload other file types.
  const allowedFormats = ALLOWED_UPLOAD_FORMATS;
  const signature = c.utils.api_sign_request({ timestamp, folder, allowed_formats: allowedFormats }, requireEnv("CLOUDINARY_API_SECRET"));
  return {
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    timestamp,
    folder,
    allowedFormats,
    signature,
  };
}

/** Light ping used by /api/health. Returns false instead of throwing. */
export async function pingCloudinary(): Promise<boolean> {
  try {
    await configured().api.ping();
    return true;
  } catch {
    return false;
  }
}
