import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * The only job of this middleware is to refresh an expiring Supabase session
 * and write the rotated tokens back as cookies. Server Components cannot set
 * cookies, so without this a signed-in visitor's session would quietly expire
 * while they were reading a page.
 *
 * Route Handlers CAN set cookies, and every /api route already calls getUser()
 * on its own, so they do not need this and are excluded below. That matters
 * more than it sounds: supabase.auth.getUser() is a network round trip to the
 * auth server, and refresh tokens rotate single-use. When one page load fanned
 * out into a page request plus half a dozen /api requests plus prefetches, all
 * of them raced to spend the same refresh token from separate serverless
 * instances, which have no lock between them. The losers got
 * "Invalid Refresh Token: Already Used", @supabase/ssr cleared the auth
 * cookies, and the person was signed out mid-session. The more tabs and
 * devices open, the more often it happened.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** @supabase/ssr stores the session in cookies named sb-<ref>-auth-token[.N]. */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export async function middleware(request: NextRequest) {
  // A guest has no session to refresh. Most traffic on this site is guests, and
  // this check turns their page loads from "one auth round trip" into "none".
  if (!hasAuthCookie(request)) return NextResponse.next({ request });

  // Prefetch responses are speculative and their Set-Cookie headers are
  // discarded, so refreshing here spends a single-use refresh token for
  // nothing and can invalidate the session the real navigation is about to use.
  if (request.headers.get("next-router-prefetch") === "1") {
    return NextResponse.next({ request });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() returns its error rather than throwing, so an expired or
  // already-spent refresh token is silent unless it is logged here. That
  // silence is why a report of "signed out for no reason" produced nothing in
  // the platform logs and had to be diagnosed from the code instead.
  const { error } = await supabase.auth.getUser();
  if (error) {
    console.warn("[middleware] session refresh failed:", error.message, request.nextUrl.pathname);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Every path except:
     *   api/*        — Route Handlers refresh and persist their own session
     *   auth/*       — the callback owns the code exchange; a getUser() here
     *                  races it for no benefit
     *   _next/*      — build output and image optimizer
     *   static files — favicon, robots, sitemap, images, fonts
     */
    "/((?!api/|auth/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
