import { API_BASE } from "@/lib/config";

/** Thrown for any non-2xx answer. `status` is the HTTP status code, `data` the parsed answer body (if any). */
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * The ONLY way browser code talks to the API.
 * Pass a path that starts with /api. Works on any host because it is relative
 * unless NEXT_PUBLIC_API_BASE_URL is set.
 */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/")) throw new Error("api() paths must start with /");
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}
