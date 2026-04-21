import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-cookie";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/inside")) {
    const ok = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
    if (!ok) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/inside/:path*"],
};
