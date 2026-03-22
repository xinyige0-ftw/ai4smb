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

  if (errorParam) {
    console.error("Auth callback error from provider:", errorParam);
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(errorParam)}`
    );
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
    if (error) console.error("Code exchange failed:", error.message);
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
    if (error) console.error("Token hash verify failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
