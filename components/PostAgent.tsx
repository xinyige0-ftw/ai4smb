"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ChannelData {
  channel: string;
  why: string;
  content: Record<string, unknown>;
}

interface FormattedPost {
  platform: string;
  ready: Record<string, unknown>;
  tips: string[];
  bestTime: string;
}

interface PostAgentProps {
  channels: ChannelData[];
  businessContext?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  email: "Email",
  instagram: "Instagram",
  facebook: "Facebook",
  google_ads: "Google Ads",
  tiktok: "TikTok",
  sms: "SMS",
  xiaohongshu: "小红书 RedNote",
  wechat: "微信 WeChat",
};

export default function PostAgent({ channels, businessContext }: PostAgentProps) {
  const t = useTranslations("postAgent");
  const [formatted, setFormatted] = useState<Record<string, FormattedPost>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  async function formatForPlatform(ch: ChannelData) {
    setLoading(prev => ({ ...prev, [ch.channel]: true }));

    try {
      const res = await fetch("/api/format-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelContent: ch,
          platform: ch.channel,
          businessContext,
        }),
      });

      const data = await res.json();
      if (data.result) {
        setFormatted(prev => ({ ...prev, [ch.channel]: data.result }));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(prev => ({ ...prev, [ch.channel]: false }));
    }
  }

  async function copyContent(channel: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [channel]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [channel]: false })), 2500);
  }

  function getReadyText(post: FormattedPost): string {
    return Object.entries(post.ready)
      .map(([key, val]) => {
        if (Array.isArray(val)) return `${key}: ${val.join(", ")}`;
        return `${key}: ${String(val)}`;
      })
      .join("\n\n");
  }

  if (channels.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-5 dark:border-purple-800 dark:bg-purple-950">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
          {t("title")}
        </h2>
        <p className="text-sm text-purple-900 dark:text-purple-100">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {channels.map((ch) => {
          const post = formatted[ch.channel];
          const isLoading = loading[ch.channel];
          const isCopied = copied[ch.channel];

          return (
            <div key={ch.channel} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {PLATFORM_LABELS[ch.channel] || ch.channel}
                </span>
                {!post && (
                  <button
                    onClick={() => formatForPlatform(ch)}
                    disabled={isLoading}
                    className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
                  >
                    {isLoading ? t("formatting") : t("prepareForPosting")}
                  </button>
                )}
              </div>

              {post && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <pre className="whitespace-pre-wrap font-sans">{getReadyText(post)}</pre>
                  </div>

                  {post.tips?.length > 0 && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {post.tips.map((tip, i) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <span className="mt-0.5">💡</span> {tip}
                        </p>
                      ))}
                    </div>
                  )}

                  {post.bestTime && (
                    <p className="text-xs text-zinc-400">{t("bestTime")}: {post.bestTime}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyContent(ch.channel, getReadyText(post))}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      {isCopied ? `✓ ${t("copied")}` : `${t("copy")} ${PLATFORM_LABELS[ch.channel] || ch.channel}`}
                    </button>
                    <button
                      onClick={() => formatForPlatform(ch)}
                      disabled={isLoading}
                      className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {isLoading ? "..." : t("reformat")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
