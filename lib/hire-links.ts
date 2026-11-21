// Browser-safe helper for the hire form (kept tiny on purpose: no validation library is sent to visitors for it).

/** The links box: one per line (commas work too). A bare address like example.com gets https:// in front. Empty lines are dropped. */
export function parseLinks(raw: string): string[] {
  return raw.split(/[\r\n,]+/).map((x) => x.trim()).filter(Boolean).map((x) => (/^https?:\/\//i.test(x) ? x : `https://${x}`));
}
