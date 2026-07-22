import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { updateSession } from "@/utils/supabase/middleware";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Never intercept NextAuth's own API routes — let them respond as JSON
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Update Supabase session cookies
  const response = await updateSession(req);

  const session = req.auth;
  
  // Extract role from session safely
  let role = (session?.user as any)?.role;

  // Public routes (login/register redirect if already logged in)
  const publicRoutes = ["/", "/login", "/register"];
  if (publicRoutes.includes(pathname)) {
    if (session) {
      return NextResponse.redirect(
        new URL(role === "admin" ? "/admin" : "/student/dashboard", req.url)
      );
    }
    return response || NextResponse.next();
  }

  // Not authenticated
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes — only admins
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/student/dashboard", req.url));
  }

  // Student routes — only students
  if (pathname.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return response || NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /api/* (all API routes — NextAuth, upload, etc.)
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, /public (static assets)
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
