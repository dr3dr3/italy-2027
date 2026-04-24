import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Public paths that must be reachable without auth — the service worker,
// manifest, PWA icons, and the Open Graph image are fetched by clients
// (browsers, link-preview crawlers) that cannot follow a redirect to /login.
const PUBLIC_PATHS = new Set([
  "/sw.js",
  "/manifest.webmanifest",
  "/icon1",
  "/icon2",
  "/apple-icon",
  "/opengraph-image",
  "/offline",
]);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);

  const isLoginPage = nextUrl.pathname === "/login";
  const isAuthApi = nextUrl.pathname.startsWith("/api/auth");
  const isPublic = PUBLIC_PATHS.has(nextUrl.pathname);

  if (isAuthApi || isPublic) return NextResponse.next();

  if (isLoginPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets + Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
  runtime: "nodejs",
};
