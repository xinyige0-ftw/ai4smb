"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import SegmentResults from "./SegmentResults";
import CampaignResults from "./CampaignResults";

const MODE_LABELS: Record<string, string> = {
  csv: "CSV upload",
  interview: "Interview",
  benchmark: "Benchmark",
  reviews: "Review analysis",
  pos: "POS data",
  social: "Social audience",
  teachme: "Guide me",
};

interface CampaignItem {
  id: string;
  name?: string;
  business_type?: string;
  business_name?: string;
  goal?: string;
  created_at: string;
  result: object;
}

interface SegmentItem {
  id: string;
  name?: string;
  mode: string;
  meta_label?: string;
  created_at: string;
  result: object;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistoryView() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCampaign, setActiveCampaign] = useState<CampaignItem | null>(null);
  const [activeSegment, setActiveSegment] = useState<SegmentItem | null>(null);
  const [tab, setTab] = useState<"segments" | "campaigns">("segments");
  const [deleting, setDeleting] = useState<string | null>(null);
  const t = useTranslations("history");
  const c = useTranslations("common");

  async function handleDelete(id: string, type: "campaign" | "segment") {
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/history?id=${id}&type=${type}`, { method: "DELETE" });
      if (res.ok) {
        if (type === "campaign") setCampaigns((prev) => prev.filter((ci) => ci.id !== id));
        else setSegments((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {}
    setDeleting(null);
  }

  useEffect(() => {
    const anonId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
        : "unknown";

    fetch(`/api/history?anonId=${encodeURIComponent(anonId)}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setSegments(data.segments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (activeCampaign) {
    return (
      <CampaignResults
        campaign={activeCampaign.result as Parameters<typeof CampaignResults>[0]["campaign"]}
        campaignId={activeCampaign.id}
        onRegenerate={() => {}}
        onStartOver={() => setActiveCampaign(null)}
        onAdjust={() => setActiveCampaign(null)}
        loading={false}
      />
    );
  }

  if (activeSegment) {
    return (
      <SegmentResults
        result={activeSegment.result as Parameters<typeof SegmentResults>[0]["result"]}
        resultId={activeSegment.id}
        meta={{ rowCount: 0, columnCount: 0 }}
        metaLabel={activeSegment.meta_label || MODE_LABELS[activeSegment.mode] || activeSegment.mode}
        onStartOver={() => setActiveSegment(null)}
        onReanalyze={() => {}}
        loading={false}
      />
    );
  }

  const empty = !loading && campaigns.length === 0 && segments.length === 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
        {t("subtitle")}
      </p>

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
        {(["segments", "campaigns"] as const).map((tabName) => (
          <button
            key={tabName}
            onClick={() => setTab(tabName)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${tab === tabName ? "bg-white shadow-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
          >
            {c(tabName)} ({tabName === "segments" ? segments.length : campaigns.length})
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-zinc-400">Loading your history...</div>
      )}

      {empty && !loading && (
        <div className="py-16 text-center">
          <div className="mb-3 text-4xl">📭</div>
          <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">{t("empty")}</p>
          <p className="mb-6 text-sm text-zinc-400">
            {t("emptyDesc")}
          </p>
          <div className="flex justify-center gap-3">
            <a href="/segment" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              {t("analyzeCustomers")}
            </a>
            <a href="/generate" className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300">
              {t("writeCampaign")}
            </a>
          </div>
        </div>
      )}

      {/* Segments list */}
      {tab === "segments" && !loading && (
        <div className="flex flex-col gap-3">
          {segments.length === 0 && !empty && (
            <p className="py-8 text-center text-sm text-zinc-400">{t("noSegments")}</p>
          )}
          {segments.map((seg) => (
            <div key={seg.id} className="group relative">
              <button
                onClick={() => setActiveSegment(seg)}
                className="flex w-full items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="mt-0.5 text-2xl">🔍</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {seg.name || seg.meta_label || MODE_LABELS[seg.mode] || "Customer Segments"}
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {MODE_LABELS[seg.mode] || seg.mode}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{timeAgo(seg.created_at)}</p>
                </div>
                <span className="mt-1 text-zinc-300 group-hover:text-blue-500 dark:text-zinc-600">→</span>
              </button>
              <button
                onClick={() => handleDelete(seg.id, "segment")}
                disabled={deleting === seg.id}
                className="absolute top-2 right-2 rounded-md p-1.5 text-zinc-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-red-400"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campaigns list */}
      {tab === "campaigns" && !loading && (
        <div className="flex flex-col gap-3">
          {campaigns.length === 0 && !empty && (
            <p className="py-8 text-center text-sm text-zinc-400">{t("noCampaigns")}</p>
          )}
          {campaigns.map((camp) => (
            <div key={camp.id} className="group relative">
              <button
                onClick={() => setActiveCampaign(camp)}
                className="flex w-full items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="mt-0.5 text-2xl">📣</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {camp.name || camp.business_name || camp.business_type || "Campaign"}
                    </span>
                    {camp.goal && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 capitalize">
                        {camp.goal.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">{timeAgo(camp.created_at)}</p>
                </div>
                <span className="mt-1 text-zinc-300 group-hover:text-blue-500 dark:text-zinc-600">→</span>
              </button>
              <button
                onClick={() => handleDelete(camp.id, "campaign")}
                disabled={deleting === camp.id}
                className="absolute top-2 right-2 rounded-md p-1.5 text-zinc-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-red-400"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
        {t("syncNote")}
      </div>
    </div>
  );
}
