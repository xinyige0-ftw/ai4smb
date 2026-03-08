"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@supabase/ssr";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function getAnonId(): string {
    return (typeof window !== "undefined" && window.localStorage.getItem("ai4smb_anon_id")) || "";
  }

  async function handleGoogle() {
    setError("");
    const anonId = getAnonId();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?anon_id=${encodeURIComponent(anonId)}&next=/history`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const anonId = getAnonId();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?anon_id=${encodeURIComponent(anonId)}&next=/history`,
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl dark:bg-zinc-900">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          ✕
        </button>

        {!sent ? (
          <>
            <div className="mb-6 text-center">
              <div className="mb-2 text-3xl">🔐</div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t("saveWork")}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t("syncPrompt")}
              </p>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:shadow-sm active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("continueWithGoogle")}
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-zinc-400 dark:bg-zinc-900">{t("orEmail")}</span>
              </div>
            </div>

            {/* Magic Link */}
            <input
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
              className="mb-3 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              onClick={handleMagicLink}
              disabled={!email.trim() || loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? t("sending") : t("sendMagicLink")}
            </button>

            {error && (
              <p className="mt-3 text-center text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {t("noPassword")}
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-4 text-4xl">📬</div>
            <h2 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">{t("checkInbox")}</h2>
            <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t.rich("magicLinkSent", { email, strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <button
              onClick={onClose}
              className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {t("gotIt")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
