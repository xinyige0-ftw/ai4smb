"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BUSINESS_TYPES } from "@/lib/prompts";
import SegmentResults from "./SegmentResults";
import VoiceInput from "./VoiceInput";

interface SegmentData {
  summary: string;
  segments: {
    name: string; percentage: number; color: string;
    description: string; characteristics: string[]; size: number; recommendations: string[];
  }[];
  quickWins: string[];
  dataQuality: string;
}

export default function SocialAnalysis({ onBack }: { onBack: () => void }) {
  const locale = useLocale();
  const t = useTranslations("socialAnalysis");
  const tb = useTranslations("businesses");
  const [socialContent, setSocialContent] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!socialContent.trim()) return;
    setLoading(true);
    setError("");

    if (businessType) {
      try {
        const prev = JSON.parse(localStorage.getItem("ai4smb_prefs") || "{}");
        localStorage.setItem("ai4smb_prefs", JSON.stringify({ ...prev, businessType }));
      } catch { /* ignore */ }
    }

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
          mode: "social",
          socialContent,
          businessType: businessType || undefined,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("errorGeneric")); return; }
      setResult(data.result);
      setResultId(data.id || null);
    } catch {
      setError(t("errorNetwork"));
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
      <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
        {t("subtitle")}
      </p>

      {/* Tips */}
      <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("tipsHeading")}</p>
        <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <p>✅ {t("tip1")}</p>
          <p>✅ {t("tip2")}</p>
          <p>✅ {t("tip3")}</p>
          <p>✅ {t("tip4")}</p>
          <p>✅ {t("tip5")}</p>
          <p>✅ {t("tip6")}</p>
        </div>
      </div>

      {/* Business type */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t("businessTypeRequired")} <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.filter(b => b.id !== "other").map((bt) => (
            <button
              key={bt.id}
              onClick={() => setBusinessType(businessType === bt.id ? "" : bt.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${businessType === bt.id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300"}`}
            >
              {bt.icon} {tb(bt.id)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        <textarea
          placeholder={t("textPlaceholder")}
          value={socialContent}
          onChange={(e) => setSocialContent(e.target.value)}
          rows={12}
          className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-relaxed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <VoiceInput onTranscript={(t) => setSocialContent((v) => v + (v ? " " : "") + t)} className="mt-1" />
      </div>
      <p className="mt-1 text-right text-xs text-zinc-400">
        {socialContent.length} {t("characters")} {socialContent.length > 5000 && t("willTrim")}
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>
      )}

      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">{t("back")}</button>
        <button
          onClick={handleAnalyze}
          disabled={!socialContent.trim() || !businessType || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{t("analyzing")}</>
          ) : t("analyzeBtn")}
        </button>
      </div>
    </div>
  );
}
