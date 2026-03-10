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

const PROPENSITY_EXPLAIN: Record<string, string> = {
  high: "Very likely to buy",
  medium: "May need a nudge",
  low: "Harder to convert",
};

const LTV_EXPLAIN: Record<string, string> = {
  high: "Big spenders",
  medium: "Average spend",
  low: "Budget-conscious",
};

function TierBadge({ label, value, explain }: { label: string; value?: string; explain?: Record<string, string> }) {
  if (!value) return null;
  const tip = explain?.[value] || "";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_COLORS[value] || TIER_COLORS.medium}`}
      title={tip}
    >
      {label}: {value}{tip ? ` · ${tip}` : ""}
    </span>
  );
}

function SegmentCard({ segment }: { segment: Segment }) {
  const [expanded, setExpanded] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const router = useRouter();
  const t = useTranslations("segmentResults");
  const c = getColor(segment.color);

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
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${c.text}`}>{segment.name}</h3>
          {segment.intent && (
            <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 italic">
              {segment.intent}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {segment.description}
          </p>
        </div>
        <div className="ml-4 flex flex-col items-end gap-1">
          <div className={`text-2xl font-bold ${c.text}`}>{segment.percentage}%</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{t("customers", { size: segment.size })}</div>
          <div className="flex flex-col gap-1">
            <TierBadge label={t("propensity")} value={segment.propensityScore} explain={PROPENSITY_EXPLAIN} />
            <TierBadge label={t("ltv")} value={segment.lifetimeValueTier} explain={LTV_EXPLAIN} />
          </div>
        </div>
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

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`mt-3 flex items-center gap-1 text-xs font-semibold ${c.text}`}
      >
        {expanded ? "▾ Less detail" : "▸ Channels, messaging & recommendations"}
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
                        className={`mt-0.5 w-7 shrink-0 rounded-full text-center py-0.5 text-[10px] font-bold ${
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
                      <span className="mt-0.5 w-7 shrink-0 rounded-full text-center bg-rose-100 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900 dark:text-rose-300">
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

          {/* Campaign button */}
          {(segment.bestChannels?.length || segment.messagingAngle) && (
            <button
              onClick={handleCampaign}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {t("turnIntoCampaign")}
            </button>
          )}
        </div>
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
  const [userInfo, setUserInfo] = useState<{ email: string; name: string; businessType: string }>({ email: "", name: "", businessType: "" });

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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("title")}
      </h1>
      {metaText && (
        <p className="mb-1 text-center text-zinc-500 dark:text-zinc-400">{metaText}</p>
      )}

      {/* Summary */}
      <div className="my-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
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
        {result.segments.map((seg) => (
          <SegmentCard key={seg.name} segment={seg} />
        ))}
      </div>

      {/* Quick wins */}
      {result.quickWins?.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
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
        />
      )}
    </div>
  );
}
