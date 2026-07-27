import { NextRequest, NextResponse, userAgent } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  // Fast, Edge-safe check for session cookie existence without DB call
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const { device } = userAgent(request);

  // device.type can be: 'mobile', 'tablet', 'console', 'smarttv',
  // 'wearable', 'embedded', or undefined (for desktop browsers)
  const viewport = device.type || "desktop";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-viewport", viewport);

  const url = request.nextUrl;
  url.searchParams.set("viewport", viewport);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/attendance", "/attendance/:path*"],
};