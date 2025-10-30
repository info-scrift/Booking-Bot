import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/:path*",
};
