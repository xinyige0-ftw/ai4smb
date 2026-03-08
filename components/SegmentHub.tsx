"use client";

import { useTranslations } from "next-intl";

export type Mode =
  | "ask"
  | "data"
  | "text"
  | "teachme"
  | "csv"
  | "interview"
  | "benchmark"
  | "reviews"
  | "pos"
  | "social";

interface ModeCard {
  id: Mode;
  icon: string;
  titleKey: string;
  descKey: string;
  badgeKey?: string;
  badge?: string;
}

const MODES: ModeCard[] = [
  {
    id: "ask",
    icon: "💬",
    titleKey: "askTitle",
    descKey: "askDesc",
    badgeKey: "easiest",
  },
  {
    id: "data",
    icon: "📊",
    titleKey: "dataTitle",
    descKey: "dataDesc",
    badge: "CSV, POS, CRM",
  },
  {
    id: "text",
    icon: "⭐",
    titleKey: "textTitle",
    descKey: "textDesc",
    badge: "Google, Yelp, social",
  },
];

interface SegmentHubProps {
  onSelect: (mode: Mode) => void;
}

export default function SegmentHub({ onSelect }: SegmentHubProps) {
  const t = useTranslations("segment");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("pageTitle")}
      </h1>
      <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
        {t("pageSubtitle")}
      </p>

      <div className="grid gap-3">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className="group flex items-start gap-4 rounded-xl border-2 border-zinc-200 bg-white p-4 text-left transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500"
          >
            <span className="mt-0.5 text-2xl">{mode.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {t(mode.titleKey)}
                </span>
                {(mode.badgeKey || mode.badge) && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {mode.badgeKey ? t(mode.badgeKey) : mode.badge}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t(mode.descKey)}
              </p>
            </div>
            <span className="mt-1 text-zinc-300 group-hover:text-blue-500 dark:text-zinc-600 dark:group-hover:text-blue-400">
              →
            </span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
        <button
          onClick={() => onSelect("teachme")}
          className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {t("guideMe")}
        </button>
      </p>

      <div className="mt-6 flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 dark:bg-green-950">
        <span className="mt-0.5 text-sm">🔒</span>
        <p className="text-xs leading-relaxed text-green-800 dark:text-green-200">
          {t("privacyNote")}
        </p>
      </div>
    </div>
  );
}
