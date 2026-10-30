import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (called "middleware" in older Next.js). Two jobs only:
 * 1. Hide the Office behind a secret URL segment (ADMIN_ROUTE_SLUG) by rewriting it to /office.
 * 2. Cheap check: office pages without a session cookie go to the login page.
 * This is NOT the security boundary. Every Office page and admin API route re-checks the session itself.
 */
const COOKIE_NAME = "vhq_session";
const RESERVED = new Set(["office", "api", "admin", "login", "museum", "connect", "_next"]);

function slug(): string | null {
  const s = process.env.ADMIN_ROUTE_SLUG;
  if (!s || !/^[a-z0-9-]{8,64}$/.test(s) || RESERVED.has(s)) return null;
  return s;
}

function notFound(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/__not-found"; // no such page, so Next.js renders its normal 404
  return NextResponse.rewrite(url, { status: 404 });
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The internal folder name must never be reachable directly.
  if (pathname === "/office" || pathname.startsWith("/office/")) return notFound(req);

  const secret = slug();
  if (!secret) return NextResponse.next();
  if (pathname !== `/${secret}` && !pathname.startsWith(`/${secret}/`)) return NextResponse.next();

  const rest = pathname.slice(secret.length + 1); // "" or "/something"
  if (rest !== "/login" && !req.cookies.has(COOKIE_NAME)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${secret}/login`;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }
  const target = req.nextUrl.clone();
  target.pathname = `/office${rest}`;
  const res = NextResponse.rewrite(target);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Skip API routes, Next.js internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|samples/).*)"],
};
