import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/projects", "/history"];

export function proxy(request: NextRequest) {
  // The offline UI demo intentionally works without an account.
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "false") return NextResponse.next();
  if (protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)) && !request.cookies.get("ai_content_factory_access")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/projects/:path*", "/history/:path*"] };
