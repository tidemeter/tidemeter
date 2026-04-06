import { NextRequest, NextResponse } from "next/server";

/** Paths that match exactly (no subpaths allowed). */
const EXACT_PUBLIC = new Set(["/login", "/t.js"]);

/** Path prefixes — only match when followed by `/` or end of string. */
const PREFIX_PUBLIC = ["/api/", "/admin/", "/share/", "/_next/"];

/** Paths that match anything starting with them (static assets). */
const STATIC_PUBLIC = ["/favicon.ico", "/icon", "/apple-icon"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    EXACT_PUBLIC.has(pathname) ||
    pathname === "/admin" ||
    PREFIX_PUBLIC.some((p) => pathname.startsWith(p)) ||
    STATIC_PUBLIC.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("payload-token");
  if (!token?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * _next is also excluded via PUBLIC_PATHS for safety.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon).*)",
  ],
};
