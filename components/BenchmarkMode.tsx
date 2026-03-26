"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BUSINESS_TYPES } from "@/lib/prompts";
import SegmentResults from "./SegmentResults";

interface SegmentData {
  summary: string;
  segments: {
    name: string; percentage: number; color: string;
    description: string; characteristics: string[]; size: number; recommendations: string[];
  }[];
  quickWins: string[];
  dataQuality: string;
}

const YEARS_OPTIONS = ["under_1", "1_to_3", "3_to_10", "10_plus"] as const;
const VOLUME_OPTIONS = ["under_50", "50_200", "200_1000", "1000_plus"] as const;
const CHALLENGE_OPTIONS = ["new_customers", "retention", "standing_out", "online_presence"] as const;

export default function BenchmarkMode({ onBack }: { onBack: () => void }) {
  const t = useTranslations("benchmark");
  const tb = useTranslations("businesses");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [customerVolume, setCustomerVolume] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!businessType) return;
    setLoading(true);
    setError("");

    try {
      const prev = JSON.parse(localStorage.getItem("ai4smb_prefs") || "{}");
      localStorage.setItem("ai4smb_prefs", JSON.stringify({ ...prev, businessType, location }));
    } catch { /* ignore */ }

    try {
      const anonId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
          : "unknown";

      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonId,
          mode: "benchmark",
          input: {
            businessType,
            location: location || undefined,
            yearsInBusiness: yearsInBusiness || undefined,
            customerVolume: customerVolume || undefined,
            biggestChallenge: biggestChallenge || undefined,
          },
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || tc("errorGeneric")); return; }
      setResult(data.result);
      setResultId(data.id || null);
    } catch {
      setError(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <SegmentResults
        result={result}
        resultId={resultId}
        meta={{ rowCount: 0, columnCount: 0 }}
        metaLabel={t("metaLabel")}
        onStartOver={onBack}
        onReanalyze={handleAnalyze}
        loading={loading}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="mb-2 text-center text-zinc-500 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <p className="mb-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
        {t("disclaimer")}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BUSINESS_TYPES.map((bt) => (
          <button
            key={bt.id}
            onClick={() => setBusinessType(bt.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all active:scale-95 ${businessType === bt.id ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900"}`}
          >
            <span className="text-2xl">{bt.icon}</span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{tb(bt.id)}</span>
          </button>
        ))}
      </div>

      {businessType && (
        <div className="mt-5 space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("locationLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={t("locationPlaceholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={`w-full rounded-lg border px-4 py-3 text-sm dark:bg-zinc-800 dark:text-zinc-100 ${!location.trim() ? "border-red-300 dark:border-red-700" : "border-zinc-300 dark:border-zinc-600"}`}
            />
          </div>

          {location.trim() && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("refineTitle")}
              </p>

              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("yearsLabel")}</div>
                <div className="flex flex-wrap gap-2">
                  {YEARS_OPTIONS.map((id) => (
                    <button key={id} onClick={() => setYearsInBusiness(yearsInBusiness === id ? "" : id)} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${yearsInBusiness === id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300"}`}>
                      {t(`years_${id}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("volumeLabel")}</div>
                <div className="flex flex-wrap gap-2">
                  {VOLUME_OPTIONS.map((id) => (
                    <button key={id} onClick={() => setCustomerVolume(customerVolume === id ? "" : id)} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${customerVolume === id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300"}`}>
                      {t(`volume_${id}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("challengeLabel")}</div>
                <div className="flex flex-wrap gap-2">
                  {CHALLENGE_OPTIONS.map((id) => (
                    <button key={id} onClick={() => setBiggestChallenge(biggestChallenge === id ? "" : id)} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${biggestChallenge === id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300"}`}>
                      {t(`challenge_${id}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
        >
          {tc("back")}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!businessType || !location.trim() || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{t("generating")}</>
          ) : t("showSegments")}
        </button>
      </div>
    </div>
  );
}
