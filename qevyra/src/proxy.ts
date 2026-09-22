import NextAuth from "next-auth";
import { authConfig } from "@/config/auth.config";
import { NextResponse } from "next/server";
import { isTrackBusinessType } from "@/lib/business-kind";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isTrackAdminRoute = nextUrl.pathname.startsWith("/track-admin");
  const isSuperAdminRoute = nextUrl.pathname.startsWith("/super-admin");
  const isLoginPage = nextUrl.pathname === "/login";

  const user = req.auth?.user as
    | { role?: string; businessType?: string | null }
    | undefined;
  const isSuper = user?.role === "SUPER_ADMIN";
  const isTrackUser = user?.role === "TRACKING_ADMIN" || isTrackBusinessType(user?.businessType);

  if (isLoginPage && isLoggedIn) {
    if (isSuper) {
      return NextResponse.redirect(new URL("/super-admin", nextUrl));
    }
    if (isTrackUser) {
      return NextResponse.redirect(new URL("/track-admin", nextUrl));
    }
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  if (
    (isAdminRoute || isTrackAdminRoute || isSuperAdminRoute) &&
    !isLoggedIn
  ) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isSuperAdminRoute && isLoggedIn && !isSuper) {
    const home = isTrackUser ? "/track-admin" : "/admin";
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  if (isTrackAdminRoute && isLoggedIn && (!isTrackUser || isSuper)) {
    if (isSuper) {
      return NextResponse.redirect(new URL("/super-admin", nextUrl));
    }
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  if (isAdminRoute && isLoggedIn && isTrackUser) {
    return NextResponse.redirect(new URL("/track-admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest).*)"],
};