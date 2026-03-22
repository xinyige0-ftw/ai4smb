"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@supabase/ssr";
import ReviewPrompt, { type ReviewSubmitData } from "./ReviewPrompt";
import { formatSegmentReport, downloadText, copyText } from "@/lib/export";

interface ChannelRec {
  channel: string;
  fit: "high" | "medium";
  reason: string;
}

interface AvoidChannel {
  channel: string;
  reason: string;
}

interface Segment {
  name: string;
  percentage: number;
  color: string;
  description: string;
  characteristics: string[];
  size: number;
  recommendations: string[];
  propensityScore?: "high" | "medium" | "low";
  lifetimeValueTier?: "high" | "medium" | "low";
  intent?: string;
  bestChannels?: ChannelRec[];
  avoidChannels?: AvoidChannel[];
  messagingAngle?: string;
  offerSuggestion?: string;
  toneGuidance?: string;
  reasoning?: string;
}

interface SegmentData {
  summary: string;
  segments: Segment[];
  quickWins: string[];
  dataQuality: string;
}

interface SegmentResultsProps {
  result: SegmentData;
  resultId?: string | null;
  meta: { rowCount: number; columnCount: number };
  metaLabel?: string;
  onStartOver: () => void;
  onReanalyze: () => void;
  loading: boolean;
  toolUsed?: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-950",   border: "border-blue-200 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-300",   bar: "bg-blue-500" },
  green:  { bg: "bg-green-50 dark:bg-green-950",  border: "border-green-200 dark:border-green-800",  text: "text-green-700 dark:text-green-300",  bar: "bg-green-500" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-950",  border: "border-amber-200 dark:border-amber-800",  text: "text-amber-700 dark:text-amber-300",  bar: "bg-amber-500" },
  rose:   { bg: "bg-rose-50 dark:bg-rose-950",    border: "border-rose-200 dark:border-rose-800",    text: "text-rose-700 dark:text-rose-300",    bar: "bg-rose-500" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300", bar: "bg-purple-500" },
  cyan:   { bg: "bg-cyan-50 dark:bg-cyan-950",    border: "border-cyan-200 dark:border-cyan-800",    text: "text-cyan-700 dark:text-cyan-300",    bar: "bg-cyan-500" },
};

function getColor(color: string) {
  return COLOR_MAP[color] || COLOR_MAP.blue;
}

const TIER_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  low: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

const PROPENSITY_KEYS: Record<string, string> = { high: "propHigh", medium: "propMed", low: "propLow" };
const LTV_KEYS: Record<string, string> = { high: "ltvHigh", medium: "ltvMed", low: "ltvLow" };

function TierBadge({ label, value, tipKey, t }: { label: string; value?: string; tipKey?: Record<string, string>; t: (k: string) => string }) {
  if (!value) return null;
  const tip = tipKey?.[value] ? t(tipKey[value]) : "";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TIER_COLORS[value] || TIER_COLORS.medium}`}
      title={tip}
    >
      {label}: {value}{tip ? ` · ${tip}` : ""}
    </span>
  );
}

function SegmentCard({ segment, initialExpanded = false }: { segment: Segment; initialExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const router = useRouter();
  const t = useTranslations("segmentResults");
  const c = getColor(segment.color);

  const hasCampaignData = !!(segment.bestChannels?.length || segment.messagingAngle);

  function handleCampaign() {
    const prefill = {
      channels: segment.bestChannels?.map((ch) => ch.channel) ?? [],
      tone: segment.toneGuidance ?? "",
      details: [segment.messagingAngle, segment.offerSuggestion].filter(Boolean).join(" — "),
    };
    const encoded = encodeURIComponent(JSON.stringify(prefill));
    router.push(`/generate?prefill=1&segment=${encoded}`);
  }

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 sm:p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className={`text-base font-bold sm:text-lg ${c.text}`}>{segment.name}</h3>
          {segment.intent && (
            <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 italic">
              {segment.intent}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xl font-bold sm:text-2xl ${c.text}`}>{segment.percentage}%</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t("customers", { size: segment.size })}</div>
        </div>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {segment.description}
      </p>

      {/* Badges — always full width, wrap naturally */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <TierBadge label={t("propensity")} value={segment.propensityScore} tipKey={PROPENSITY_KEYS} t={t} />
        <TierBadge label={t("ltv")} value={segment.lifetimeValueTier} tipKey={LTV_KEYS} t={t} />
      </div>

      {/* Bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-full rounded-full ${c.bar} transition-all duration-500`}
          style={{ width: `${Math.min(segment.percentage, 100)}%` }}
        />
      </div>

      {/* Characteristics */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {segment.characteristics.map((trait, i) => (
          <span
            key={i}
            className="rounded-full bg-white/60 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
          >
            {trait}
          </span>
        ))}
      </div>

      {/* Expand toggle — styled as a prominent button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
          expanded
            ? `${c.border} ${c.text} bg-white/50 dark:bg-zinc-800/50`
            : `border-dashed ${c.border} ${c.text} hover:bg-white/60 dark:hover:bg-zinc-800/40`
        }`}
      >
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {expanded ? t("lessDetail") : t("moreDetail")}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Where to reach them */}
          {(segment.bestChannels?.length || segment.avoidChannels?.length) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("whereToReach")}
              </h4>
              {segment.bestChannels && segment.bestChannels.length > 0 && (
                <div className="mt-2 space-y-2">
                  {segment.bestChannels.map((ch, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          ch.fit === "high"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        }`}
                      >
                        {ch.fit === "high" ? "✓" : "~"}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{ch.channel}</span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{ch.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {segment.avoidChannels && segment.avoidChannels.length > 0 && (
                <div className="mt-2 space-y-2">
                  {segment.avoidChannels.map((ch, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                        ✗
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{ch.channel}</span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{ch.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* What to tell them */}
          {(segment.messagingAngle || segment.offerSuggestion || segment.toneGuidance) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("whatToTell")}
              </h4>
              <div className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                {segment.messagingAngle && (
                  <p><span className="font-semibold">{t("messageLabel")}</span> {segment.messagingAngle}</p>
                )}
                {segment.offerSuggestion && (
                  <p><span className="font-semibold">{t("offerIdea")}</span> {segment.offerSuggestion}</p>
                )}
                {segment.toneGuidance && (
                  <p><span className="font-semibold">{t("toneLabel")}</span> {segment.toneGuidance}</p>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {segment.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("recommendations", { count: segment.recommendations.length })}
              </h4>
              <ul className="mt-2 space-y-1">
                {segment.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="mt-0.5 text-xs">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Why this recommendation? */}
          {segment.reasoning && (
            <>
              <button
                onClick={() => setReasoningExpanded(!reasoningExpanded)}
                className={`text-xs font-semibold ${c.text}`}
              >
                {reasoningExpanded ? t("hideReasoning") : t("whyThisRecommendation")}
              </button>
              {reasoningExpanded && (
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {segment.reasoning}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Campaign button — always visible when data exists */}
      {hasCampaignData && (
        <button
          onClick={handleCampaign}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
          {t("turnIntoCampaign")}
        </button>
      )}
    </div>
  );
}

export default function SegmentResults({
  result,
  resultId,
  meta,
  metaLabel,
  onStartOver,
  onReanalyze,
  loading,
  toolUsed,
}: SegmentResultsProps) {
  const t = useTranslations("segmentResults");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string; businessType: string; location: string }>({ email: "", name: "", businessType: "", location: "" });

  useEffect(() => {
    const prefs = (() => { try { return JSON.parse(localStorage.getItem("ai4smb_prefs") || "{}"); } catch { return {}; } })();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      setUserInfo({
        email: u?.email ?? "",
        name: u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? "",
        businessType: prefs.businessType ?? "",
        location: prefs.location ?? "",
      });
    });
  }, []);

  function handleDownload() {
    const text = formatSegmentReport(result, metaLabel);
    downloadText(text, "customer-segments.txt");
  }

  async function handleCopy() {
    const text = formatSegmentReport(result, metaLabel);
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleReviewSubmit(data: ReviewSubmitData) {
    try {
      const anonId = localStorage.getItem("anonId") ?? "";
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, anonId }),
      });
    } catch {
      // silent – review is non-critical
    }
    setShowReview(false);
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 4000);
  }

  async function handleShare() {
    if (!resultId) return;
    const url = window.location.origin + "/share/" + resultId;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  }

  const metaText =
    metaLabel ||
    (meta.rowCount > 0
      ? t("metaText", { rowCount: meta.rowCount, columnCount: meta.columnCount })
      : null);

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-4 sm:py-8">
      <h1 className="mb-2 text-center text-xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-2xl">
        {t("title")}
      </h1>
      {metaText && (
        <p className="mb-1 text-center text-zinc-500 dark:text-zinc-400">{metaText}</p>
      )}

      {/* Summary */}
      <div className="my-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:my-6 sm:p-5 dark:border-blue-800 dark:bg-blue-950">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          {t("keyInsight")}
        </h2>
        <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
          {result.summary}
        </p>
      </div>

      {/* Segment distribution bar */}
      <div className="mb-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t("segmentDistribution")}
        </div>
        <div className="flex h-6 w-full overflow-hidden rounded-full">
          {result.segments.map((seg) => {
            const c = getColor(seg.color);
            return (
              <div
                key={seg.name}
                className={`${c.bar} relative transition-all duration-500`}
                style={{ width: `${seg.percentage}%` }}
                title={`${seg.name}: ${seg.percentage}%`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {result.segments.map((seg) => {
            const c = getColor(seg.color);
            return (
              <div key={seg.name} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${c.bar}`} />
                {seg.name} ({seg.percentage}%)
              </div>
            );
          })}
        </div>
      </div>

      {/* Segment cards */}
      <div className="flex flex-col gap-4">
        {result.segments.map((seg, idx) => (
          <SegmentCard key={seg.name} segment={seg} initialExpanded={idx === 0} />
        ))}
      </div>

      {/* Quick wins */}
      {result.quickWins?.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:mt-6 sm:p-5 dark:border-amber-800 dark:bg-amber-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {t("quickWins")}
          </h2>
          <ul className="space-y-2">
            {result.quickWins.map((win, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                <span className="mt-0.5">⚡</span>
                {win}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data quality note */}
      {result.dataQuality && (
        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          {result.dataQuality}
        </p>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onReanalyze}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("reanalyzing")}
            </>
          ) : (
            t("reanalyze")
          )}
        </button>
        <button
          onClick={handleDownload}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {"📥 "}{t("download")}
        </button>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {copied ? `✓ ${t("copied")}` : `📋 ${t("copyAll")}`}
        </button>
        {resultId && (
          <button
            onClick={handleShare}
            className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {shareCopied ? `✓ ${t("linkCopied")}` : `🔗 ${t("share")}`}
          </button>
        )}
        <button
          onClick={onStartOver}
          className="rounded-lg px-5 py-3 text-sm font-medium text-zinc-400 transition-all hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {t("tryAnother")}
        </button>
      </div>

      {/* Floating review button */}
      {!reviewSubmitted && (
        <button
          onClick={() => setShowReview(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
        >
          {"⭐ "}{t("leaveRating")}
        </button>
      )}
      {reviewSubmitted && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {"✓ "}{t("thanksFeedback")}
        </div>
      )}

      {showReview && (
        <ReviewPrompt
          onClose={() => setShowReview(false)}
          onSubmit={handleReviewSubmit}
          toolsUsed={[toolUsed ?? "segment_csv"]}
          segmentsCount={result.segments.length}
          userEmail={userInfo.email}
          userName={userInfo.name}
          businessType={userInfo.businessType}
          location={userInfo.location}
        />
      )}
    </div>
  );
}
