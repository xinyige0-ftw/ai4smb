"use client";

import { useState } from "react";
import { formatSegmentReport, downloadText, copyText } from "@/lib/export";

interface Segment {
  name: string;
  percentage: number;
  color: string;
  description: string;
  characteristics: string[];
  size: number;
  recommendations: string[];
}

interface SegmentData {
  summary: string;
  segments: Segment[];
  quickWins: string[];
  dataQuality: string;
}

interface SegmentResultsProps {
  result: SegmentData;
  meta: { rowCount: number; columnCount: number };
  metaLabel?: string;
  onStartOver: () => void;
  onReanalyze: () => void;
  loading: boolean;
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

function SegmentCard({ segment }: { segment: Segment }) {
  const [expanded, setExpanded] = useState(false);
  const c = getColor(segment.color);

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${c.text}`}>{segment.name}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {segment.description}
          </p>
        </div>
        <div className="ml-4 text-right">
          <div className={`text-2xl font-bold ${c.text}`}>{segment.percentage}%</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">~{segment.size} customers</div>
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

      {/* Recommendations (expandable) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`mt-3 text-xs font-semibold ${c.text}`}
      >
        {expanded ? "Hide recommendations ▲" : `${segment.recommendations.length} recommendations ▼`}
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1.5">
          {segment.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="mt-0.5 text-xs">→</span>
              {rec}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SegmentResults({
  result,
  meta,
  metaLabel,
  onStartOver,
  onReanalyze,
  loading,
}: SegmentResultsProps) {
  const [copied, setCopied] = useState(false);

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

  const metaText =
    metaLabel ||
    (meta.rowCount > 0
      ? `${meta.rowCount} customers analyzed across ${meta.columnCount} data points`
      : null);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Your Audience Segments
      </h1>
      {metaText && (
        <p className="mb-1 text-center text-zinc-500 dark:text-zinc-400">{metaText}</p>
      )}

      {/* Summary */}
      <div className="my-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Key Insight
        </h2>
        <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
          {result.summary}
        </p>
      </div>

      {/* Segment distribution bar */}
      <div className="mb-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Segment Distribution
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
            Quick Wins
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
              Re-analyzing...
            </>
          ) : (
            "Re-analyze"
          )}
        </button>
        <button
          onClick={handleDownload}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          📥 Download
        </button>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {copied ? "✓ Copied!" : "📋 Copy all"}
        </button>
        <button
          onClick={onStartOver}
          className="rounded-lg px-5 py-3 text-sm font-medium text-zinc-400 transition-all hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Try another method
        </button>
      </div>
    </div>
  );
}
