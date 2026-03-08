"use client";

import { useState } from "react";

const CHANNEL_LABELS: Record<string, { label: string; icon: string }> = {
  email: { label: "Email", icon: "📧" },
  instagram: { label: "Instagram", icon: "📸" },
  facebook: { label: "Facebook", icon: "👍" },
  google_ads: { label: "Google Ads", icon: "🔍" },
  tiktok: { label: "TikTok", icon: "🎵" },
  sms: { label: "SMS", icon: "💬" },
  xiaohongshu: { label: "小红书 RedNote", icon: "📕" },
  wechat: { label: "微信 WeChat", icon: "💚" },
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

function hasVariants(content: Record<string, unknown>): content is { variant_a: Record<string, unknown>; variant_b: Record<string, unknown> } {
  return content.variant_a != null && typeof content.variant_a === "object"
    && content.variant_b != null && typeof content.variant_b === "object";
}

function renderChannelContent(channel: string, content: Record<string, unknown>) {
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
              Best time to post: {String(content.bestTime)}
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
              Suggested daily budget: {String(content.dailyBudget)}
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
    case "xiaohongshu":
      return (
        <>
          <ContentBlock label="Note Title" value={String(content.title || "")} />
          <ContentBlock label="Note Body" value={String(content.body || "")} />
          {Array.isArray(content.hashtags) && (
            <ContentBlock label="Hashtags" value={content.hashtags.map((h: string) => `#${h}`).join(" ")} />
          )}
          {content.coverTextIdea && (
            <ContentBlock label="Cover Text Idea" value={String(content.coverTextIdea)} />
          )}
          {Array.isArray(content.productTags) && content.productTags.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Product tags: {content.productTags.join(", ")}
            </p>
          )}
          {content.bestTime && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Best time to post: {String(content.bestTime)}
            </p>
          )}
        </>
      );
    case "wechat":
      return (
        <>
          {content.momentsPost && (
            <ContentBlock label="Moments Post" value={String(content.momentsPost)} />
          )}
          {content.officialAccountTitle && (
            <ContentBlock label="Official Account Article" value={String(content.officialAccountTitle)} />
          )}
          {content.officialAccountSummary && (
            <ContentBlock label="Article Summary" value={String(content.officialAccountSummary)} />
          )}
          {content.miniProgramCta && (
            <ContentBlock label="Mini Program CTA" value={String(content.miniProgramCta)} />
          )}
          {content.bestTime && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Best time to post: {String(content.bestTime)}
            </p>
          )}
        </>
      );
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

export default function ChannelCard({ channel, why, content }: ChannelCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [activeVariant, setActiveVariant] = useState<"a" | "b">("a");
  const info = CHANNEL_LABELS[channel] || { label: channel, icon: "📢" };

  const variants = hasVariants(content);
  const displayContent = variants
    ? (activeVariant === "a" ? content.variant_a : content.variant_b) as Record<string, unknown>
    : content;

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

      {variants && (
        <div className="mt-3">
          <span className="mb-1.5 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Two versions to try
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveVariant("a")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeVariant === "a"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              Version A
            </button>
            <button
              onClick={() => setActiveVariant("b")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeVariant === "b"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              Version B
            </button>
          </div>
        </div>
      )}

      {showWhy && (
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {why}
        </p>
      )}

      {renderChannelContent(channel, displayContent)}
    </div>
  );
}
