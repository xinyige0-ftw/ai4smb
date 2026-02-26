"use client";

import ChannelCard from "./ChannelCard";

interface CampaignData {
  strategy: string;
  channels: {
    channel: string;
    why: string;
    content: Record<string, unknown>;
  }[];
}

interface CampaignResultsProps {
  campaign: CampaignData;
  onRegenerate: () => void;
  onStartOver: () => void;
  onAdjust: () => void;
  loading: boolean;
}

export default function CampaignResults({
  campaign,
  onRegenerate,
  onStartOver,
  onAdjust,
  loading,
}: CampaignResultsProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Your Campaign
      </h1>
      <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
        Here&apos;s your personalized marketing plan
      </p>

      {/* Strategy brief */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Strategy
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
              Regenerating...
            </>
          ) : (
            "🔄 Regenerate all"
          )}
        </button>
        <button
          onClick={onAdjust}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ✏️ Adjust inputs
        </button>
        <button
          onClick={onStartOver}
          className="rounded-lg px-5 py-3 text-sm font-medium text-zinc-400 transition-all hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
