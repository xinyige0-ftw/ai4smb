"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RedactionReport } from "@/lib/segment-prompts";

/**
 * Calm, informational disclosure of what stripPii / stripPiiFromSummary
 * removed from an uploaded/pasted dataset before anything left the browser.
 */
export default function PrivacyRedactionNotice({ report }: { report: RedactionReport }) {
  const t = useTranslations("privacyNotice");
  const hasRedactedColumns = report.redactedColumns.length > 0;
  const hasCounts = report.emailsMasked > 0 || report.phonesMasked > 0;

  return (
    <div className="mb-6 rounded-2xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 text-base">✅</span>
        <div className="flex-1 text-sm leading-relaxed text-green-800 dark:text-green-200">
          <p className="font-semibold text-green-900 dark:text-green-50">{t("heading")}</p>

          <p className="mt-1.5">
            {hasRedactedColumns
              ? t("bodyColumns", { columns: report.redactedColumns.join(", ") })
              : t("bodyNone")}
          </p>

          {hasRedactedColumns && hasCounts && (
            <p className="mt-1.5">
              {t("bodyCounts", { emails: report.emailsMasked, phones: report.phonesMasked })}
            </p>
          )}

          <p className="mt-1.5">{t("bodyScope")}</p>
          <p className="mt-1.5">{t("bodyNoTraining")}</p>

          <Link
            href="/privacy"
            className="mt-2 inline-block font-medium text-green-700 underline underline-offset-2 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
          >
            {t("linkText")}
          </Link>
        </div>
      </div>
    </div>
  );
}
