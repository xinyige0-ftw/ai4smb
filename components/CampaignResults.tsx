"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@supabase/ssr";
import ChannelCard from "./ChannelCard";
import PostAgent from "./PostAgent";
import ReviewPrompt, { type ReviewSubmitData } from "./ReviewPrompt";
import { formatCampaignReport, downloadText, copyText } from "@/lib/export";

interface CampaignData {
  strategy: string;
  channels: {
    channel: string;
    why: string;
    content: Record<string, unknown>;
  }[];
  thisWeek?: { day: string; action: string; why: string }[];
}

interface CampaignResultsProps {
  campaign: CampaignData;
  campaignId?: string | null;
  onRegenerate: () => void;
  onStartOver: () => void;
  onAdjust: () => void;
  loading: boolean;
}

const DAY_MAP: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
  "周一": "周一", "周二": "周二", "周三": "周三", "周四": "周四",
  "周五": "周五", "周六": "周六", "周日": "周日",
  "星期一": "周一", "星期二": "周二", "星期三": "周三", "星期四": "周四",
  "星期五": "周五", "星期六": "周六", "星期日": "周日",
};

function normalizeDay(raw: string): string {
  const key = raw.trim().toLowerCase();
  return DAY_MAP[key] || raw.slice(0, 3);
}

export default function CampaignResults({
  campaign,
  campaignId,
  onRegenerate,
  onStartOver,
  onAdjust,
  loading,
}: CampaignResultsProps) {
  const t = useTranslations("generate");
  const tc = useTranslations("common");
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
    downloadText(formatCampaignReport(campaign), "marketing-campaign.txt");
  }

  async function handleCopy() {
    await copyText(formatCampaignReport(campaign));
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
    if (!campaignId) return;
    const url = window.location.origin + "/share/" + campaignId;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 3000);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("resultTitle")}
      </h1>
      <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
        {t("resultSubtitle")}
      </p>

      {/* Strategy brief */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          {t("strategy")}
        </h2>
        <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
          {campaign.strategy}
        </p>
      </div>

      {/* Channel cards */}
      <div className="flex flex-col gap-4">
        {campaign.channels.map((ch) => (
          <ChannelCard
            key={ch.channel}
            channel={ch.channel}
            why={ch.why}
            content={ch.content}
          />
        ))}
      </div>

      {/* This Week's Action Plan */}
      {campaign.thisWeek && campaign.thisWeek.length > 0 && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            {t("thisWeekTitle")}
          </h2>
          <div className="space-y-3">
            {campaign.thisWeek.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="inline-block w-10 shrink-0 rounded-lg bg-green-100 py-1 text-center text-xs font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                  {normalizeDay(item.day)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">{item.action}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">{item.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("regenerating")}
            </>
          ) : (
            `🔄 ${t("regenerate")}`
          )}
        </button>
        <button
          onClick={handleDownload}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          📥 {tc("download")}
        </button>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {copied ? `✓ ${tc("copied")}` : `📋 ${tc("copy")}`}
        </button>
        {campaignId && (
          <button
            onClick={handleShare}
            className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {shareCopied ? `✓ ${t("linkCopied")}` : `🔗 ${t("share")}`}
          </button>
        )}
        <button
          onClick={onAdjust}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ✏️ {t("adjust")}
        </button>
        <button
          onClick={onStartOver}
          className="rounded-lg px-5 py-3 text-sm font-medium text-zinc-400 transition-all hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {tc("startOver")}
        </button>
      </div>

      <PostAgent channels={campaign.channels} />

      {/* Floating review button */}
      {!reviewSubmitted && (
        <button
          onClick={() => setShowReview(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
        >
          ⭐ {t("leaveRating") ?? "Rate this"}
        </button>
      )}
      {reviewSubmitted && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          ✓ {t("thanksFeedback") ?? "Thanks!"}
        </div>
      )}

      {showReview && (
        <ReviewPrompt
          onClose={() => setShowReview(false)}
          onSubmit={handleReviewSubmit}
          toolsUsed={["campaign_form"]}
          campaignsCount={1}
          userEmail={userInfo.email}
          userName={userInfo.name}
          businessType={userInfo.businessType}
          location={userInfo.location}
        />
      )}
    </div>
  );
}
