import { NextResponse } from "next/server";
import { createAuthClient, mergeGuestToUser } from "@/lib/auth";

/**
 * OAuth and Magic Link callback handler.
 * Supabase redirects here after a successful sign-in.
 * Handles both PKCE code flow (OAuth + newer magic links)
 * and token_hash flow (older magic link format).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "invite"
    | "magiclink"
    | "email"
    | undefined;
  const anonId = searchParams.get("anon_id") || "";
  const next = searchParams.get("next") || "/history";
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  // The reason is a fixed vocabulary, not the provider's raw message: the home
  // page turns it into an explanation, and a provider string in a URL the person
  // can see is neither readable nor safe to echo back.
  const fail = (reason: "expired" | "browser" | "provider" | "unknown") =>
    NextResponse.redirect(`${origin}/?auth_error=${reason}`);

  if (errorParam) {
    console.error("Auth callback error from provider:", errorParam);
    return fail("provider");
  }

  const supabase = await createAuthClient();

  // Flow 1: PKCE code exchange (Google OAuth and newer magic links)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (anonId && anonId !== "unknown") {
        await mergeGuestToUser(anonId, data.user.id);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    if (error) {
      // The PKCE verifier lives in a cookie set when the link was requested. If
      // the link is opened in a different browser, that cookie is absent and the
      // exchange cannot succeed no matter how fresh the link is.
      console.error("Code exchange failed:", error.message);
      return fail("browser");
    }
  }

  // Flow 2: Token hash verification (magic link / OTP fallback)
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user) {
      if (anonId && anonId !== "unknown") {
        await mergeGuestToUser(anonId, data.user.id);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    if (error) {
      // A one-time token that fails to verify has almost always been used
      // already, most often by a mail client or scanner prefetching the link.
      console.error("Token hash verify failed:", error.message);
      return fail("expired");
    }
  }

  console.error("Auth callback reached with no code and no token_hash.");
  return fail("unknown");
}
