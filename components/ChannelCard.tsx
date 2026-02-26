"use client";

import { useState } from "react";

const CHANNEL_LABELS: Record<string, { label: string; icon: string }> = {
  email: { label: "Email", icon: "📧" },
  instagram: { label: "Instagram", icon: "📸" },
  facebook: { label: "Facebook", icon: "👍" },
  google_ads: { label: "Google Ads", icon: "🔍" },
  tiktok: { label: "TikTok", icon: "🎵" },
  sms: { label: "SMS", icon: "💬" },
};

function ContentBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {label}
        </span>
        <button
          onClick={copy}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <div className="whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
        {value}
      </div>
    </div>
  );
}

interface ChannelCardProps {
  channel: string;
  why: string;
  content: Record<string, unknown>;
}

export default function ChannelCard({ channel, why, content }: ChannelCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const info = CHANNEL_LABELS[channel] || { label: channel, icon: "📢" };

  function renderContent() {
    switch (channel) {
      case "email":
        return (
          <>
            <ContentBlock label="Subject Line" value={String(content.subject || "")} />
            <ContentBlock label="Email Body" value={String(content.body || "")} />
          </>
        );
      case "instagram":
        return (
          <>
            <ContentBlock label="Caption" value={String(content.caption || "")} />
            <ContentBlock label="Image Idea" value={String(content.imageIdea || "")} />
            {content.bestTime && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                🕐 Best time to post: {String(content.bestTime)}
              </p>
            )}
          </>
        );
      case "facebook":
        return (
          <>
            <ContentBlock label="Post" value={String(content.text || "")} />
            {content.boostTip && (
              <ContentBlock label="Boost Tip" value={String(content.boostTip || "")} />
            )}
          </>
        );
      case "google_ads":
        return (
          <>
            {Array.isArray(content.headlines) && (
              <ContentBlock label="Headlines" value={content.headlines.join("\n")} />
            )}
            {Array.isArray(content.descriptions) && (
              <ContentBlock label="Descriptions" value={content.descriptions.join("\n")} />
            )}
            {Array.isArray(content.keywords) && (
              <ContentBlock label="Keywords" value={content.keywords.join(", ")} />
            )}
            {content.dailyBudget && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                💰 Suggested daily budget: {String(content.dailyBudget)}
              </p>
            )}
          </>
        );
      case "tiktok":
        return (
          <>
            <ContentBlock label="Hook (first 3 seconds)" value={String(content.hook || "")} />
            <ContentBlock label="Script" value={String(content.script || "")} />
            <ContentBlock label="Call to Action" value={String(content.cta || "")} />
          </>
        );
      case "sms":
        return <ContentBlock label="Message" value={String(content.text || "")} />;
      default:
        return (
          <ContentBlock
            label="Content"
            value={Object.entries(content)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join("\n")}
          />
        );
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
          <span>{info.icon}</span>
          {info.label}
        </h3>
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          {showWhy ? "Hide reasoning" : "Why this channel?"}
        </button>
      </div>

      {showWhy && (
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {why}
        </p>
      )}

      {renderContent()}
    </div>
  );
}
