"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ImageGenerator from "./ImageGenerator";

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

function ContentBlock({ label, value, copiedLabel, copyLabel }: { label: string; value: string; copiedLabel: string; copyLabel: string }) {
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
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <div className="whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2.5 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
        {value}
      </div>
    </div>
  );
}

function TimeBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
      <span>🕐</span>
      <span>{label}:</span>
      <span className="font-semibold">{value}</span>
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

function renderChannelContent(channel: string, content: Record<string, unknown>, t: (key: string) => string) {
  const cp = { copiedLabel: t("copied"), copyLabel: t("copy") };
  switch (channel) {
    case "email":
      return (
        <>
          <ContentBlock label={t("subjectLine")} value={String(content.subject || "")} {...cp} />
          <ContentBlock label={t("emailBody")} value={String(content.body || "")} {...cp} />
        </>
      );
    case "instagram":
      return (
        <>
          <ContentBlock label={t("caption")} value={String(content.caption || "")} {...cp} />
          <ContentBlock label={t("imageIdea")} value={String(content.imageIdea || "")} {...cp} />
          {content.imageIdea && (
            <ImageGenerator
              prompt={String(content.imageIdea)}
              width={1080}
              height={1080}
              label={t("generateImage")}
            />
          )}
          {content.bestTime && <TimeBadge label={t("bestTime")} value={String(content.bestTime)} />}
        </>
      );
    case "facebook":
      return (
        <>
          <ContentBlock label={t("post")} value={String(content.text || "")} {...cp} />
          {content.text && (
            <ImageGenerator
              prompt={`Facebook post image for: ${String(content.text).slice(0, 200)}`}
              width={1200}
              height={630}
              label={t("generateImage")}
            />
          )}
          {content.boostTip && (
            <ContentBlock label={t("boostTip")} value={String(content.boostTip || "")} {...cp} />
          )}
        </>
      );
    case "google_ads":
      return (
        <>
          {Array.isArray(content.headlines) && (
            <ContentBlock label={t("headlines")} value={content.headlines.join("\n")} {...cp} />
          )}
          {Array.isArray(content.descriptions) && (
            <ContentBlock label={t("descriptions")} value={content.descriptions.join("\n")} {...cp} />
          )}
          {Array.isArray(content.keywords) && (
            <ContentBlock label={t("keywords")} value={content.keywords.join(", ")} {...cp} />
          )}
          {content.dailyBudget && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {t("dailyBudget")}: {String(content.dailyBudget)}
            </p>
          )}
        </>
      );
    case "tiktok":
      return (
        <>
          <ContentBlock label={t("hook")} value={String(content.hook || "")} {...cp} />
          <ContentBlock label={t("script")} value={String(content.script || "")} {...cp} />
          <ContentBlock label={t("callToAction")} value={String(content.cta || "")} {...cp} />
          {content.hook && (
            <ImageGenerator
              prompt={`TikTok thumbnail: ${String(content.hook)}`}
              width={1080}
              height={1920}
              label={t("generateThumbnail")}
            />
          )}
        </>
      );
    case "sms":
      return <ContentBlock label={t("message")} value={String(content.text || "")} {...cp} />;
    case "xiaohongshu":
      return (
        <>
          <ContentBlock label={t("noteTitle")} value={String(content.title || "")} {...cp} />
          <ContentBlock label={t("noteBody")} value={String(content.body || "")} {...cp} />
          {Array.isArray(content.hashtags) && (
            <ContentBlock label={t("hashtags")} value={content.hashtags.map((h: string) => `#${h}`).join(" ")} {...cp} />
          )}
          {content.coverTextIdea && (
            <>
              <ContentBlock label={t("coverTextIdea")} value={String(content.coverTextIdea)} {...cp} />
              <ImageGenerator
                prompt={String(content.coverTextIdea)}
                width={1080}
                height={1440}
                label={t("generateCover")}
              />
            </>
          )}
          {Array.isArray(content.productTags) && content.productTags.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {t("productTags")}: {content.productTags.join(", ")}
            </p>
          )}
          {content.bestTime && <TimeBadge label={t("bestTime")} value={String(content.bestTime)} />}
        </>
      );
    case "wechat":
      return (
        <>
          {content.momentsPost && (
            <ContentBlock label={t("momentsPost")} value={String(content.momentsPost)} {...cp} />
          )}
          {content.officialAccountTitle && (
            <ContentBlock label={t("officialAccount")} value={String(content.officialAccountTitle)} {...cp} />
          )}
          {content.officialAccountSummary && (
            <ContentBlock label={t("articleSummary")} value={String(content.officialAccountSummary)} {...cp} />
          )}
          {content.miniProgramCta && (
            <ContentBlock label={t("miniProgramCta")} value={String(content.miniProgramCta)} {...cp} />
          )}
          {content.bestTime && <TimeBadge label={t("bestTime")} value={String(content.bestTime)} />}
        </>
      );
    default:
      return (
        <ContentBlock
          label={t("content")}
          value={Object.entries(content)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join("\n")}
          {...cp}
        />
      );
  }
}

export default function ChannelCard({ channel, why, content }: ChannelCardProps) {
  const t = useTranslations("channel");
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
          {showWhy ? t("hideReasoning") : t("whyThis")}
        </button>
      </div>

      {variants && (
        <div className="mt-3">
          <span className="mb-1.5 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {t("twoVersions")}
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
              {t("versionA")}
            </button>
            <button
              onClick={() => setActiveVariant("b")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeVariant === "b"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {t("versionB")}
            </button>
          </div>
        </div>
      )}

      {showWhy && (
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {why}
        </p>
      )}

      {renderChannelContent(channel, displayContent, t)}
    </div>
  );
}
