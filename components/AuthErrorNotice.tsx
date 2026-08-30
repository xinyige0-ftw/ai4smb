"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Sign-in failures used to be silent: /auth/callback redirected to
 * "/?auth_error=..." and nothing read the parameter, so the person landed on an
 * ordinary home page with no explanation and no idea what to do next.
 *
 * This reads the parameter, explains the most likely cause, and then strips it
 * from the address bar so a later refresh does not show a stale warning. The
 * value is read during render rather than in an effect, so the banner is present
 * on the first paint instead of appearing a frame later.
 */

const REASONS = ["expired", "browser", "provider", "unknown"] as const;
type Reason = (typeof REASONS)[number];

function toReason(value: string | null): Reason | null {
  if (!value) return null;
  return (REASONS as readonly string[]).includes(value) ? (value as Reason) : "unknown";
}

function AuthErrorBanner() {
  const t = useTranslations("authError");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Frozen at first render. The effect below removes the parameter from the URL,
  // which would otherwise take the banner down with it on the very next render.
  const [reason] = useState(() => toReason(params.get("auth_error")));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!reason) return;
    const next = new URLSearchParams(window.location.search);
    next.delete("auth_error");
    const query = next.toString();
    // router.replace rather than history.replaceState: the App Router keeps its
    // own history state, and a raw replaceState is put back on the next sync.
    router.replace(pathname + (query ? `?${query}` : ""), { scroll: false });
  }, [reason, router, pathname]);

  if (!reason || dismissed) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950"
    >
      <div className="mx-auto flex max-w-4xl items-start gap-3">
        <span aria-hidden="true" className="text-base leading-5">
          ⚠️
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {t("title")}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-amber-800 dark:text-amber-300">
            {t(reason)}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("dismiss")}
          className="shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function AuthErrorNotice() {
  // useSearchParams needs a Suspense boundary so the rest of the page can still
  // be rendered statically.
  return (
    <Suspense fallback={null}>
      <AuthErrorBanner />
    </Suspense>
  );
}
