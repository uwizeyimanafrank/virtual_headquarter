"use client";
import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Sign = { cloudName: string; apiKey: string; timestamp: number; folder: string; allowedFormats: string; signature: string };

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Drag-and-drop image upload straight to Cloudinary.
 * The server only hands out a signature; the secret never reaches the browser.
 */
export function Uploader({ folder, value, onChange }: { folder: "project" | "certificate" | "story" | "book" | "reference" | "profile" | "slot"; value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (!TYPES.includes(file.type)) return setError("Please choose a JPG, PNG, WebP, GIF or AVIF image.");
    if (file.size > MAX_BYTES) return setError("That image is bigger than 8 MB. Please shrink it first.");
    try {
      setProgress(0);
      const sign = await api<Sign>("/api/admin/upload-sign", { method: "POST", body: JSON.stringify({ folder }) });
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("folder", sign.folder);
      form.append("allowed_formats", sign.allowedFormats);
      form.append("signature", sign.signature);

      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloudName)}/image/upload`);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
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
      onChange(url);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void upload(f); }}
        className={`flex flex-col items-center gap-2 rounded-xl border border-dashed p-4 text-center text-sm transition ${over ? "border-accent bg-surface-strong" : "border-line bg-surface"}`}
      >
        {value ? (
          // The image address is checked on the server (Cloudinary or bundled samples only).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Current image" className="max-h-40 rounded-lg object-cover" />
        ) : (
          <p className="text-muted">Drop an image here</p>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface-strong" onClick={() => input.current?.click()} disabled={progress !== null}>
            {value ? "Replace image" : "Choose image"}
          </button>
          {value && <button type="button" className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface-strong" onClick={() => onChange("")}>Remove</button>}
        </div>
        {value.startsWith("/samples/") && <p className="text-xs text-amber-300">This is a sample image.</p>}
        {progress !== null && (
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-strong" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
