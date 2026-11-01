/**
 * Reads a JSON request body but refuses oversized ones, so a stranger cannot make the server
 * swallow a giant upload. Checks the announced size first, then the real size.
 * Returns { ok: false, status } to answer with (413 too big, 400 not JSON).
 */
export async function readJsonLimited(request: Request, maxBytes = 20_000): Promise<{ ok: true; data: unknown } | { ok: false; status: 400 | 413 }> {
  const announced = Number(request.headers.get("content-length") ?? 0);
  if (announced > maxBytes) return { ok: false, status: 413 };
  const text = await request.text().catch(() => null);
  if (text === null) return { ok: false, status: 400 };
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, status: 413 };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400 };
  }
}
