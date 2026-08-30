import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";
import DashboardSignInPrompt from "@/components/DashboardSignInPrompt";
import { getUser } from "@/lib/auth";
import { getDashboardStats } from "@/app/api/dashboard/route";
import { CHANNELS, BUSINESS_TYPES, GOALS } from "@/lib/prompts";

export const metadata: Metadata = {
  title: "My Marketing — AI4SMB Insights",
  description: "A summary of your own campaigns and customer analyses on AI4SMB Insights.",
};

const SUPPORTED_CHANNELS = CHANNELS.filter((c) => c.id !== "smart");
const KNOWN_BUSINESS_TYPE_IDS = new Set<string>(BUSINESS_TYPES.map((b) => b.id));
const KNOWN_GOAL_IDS = new Set<string>(GOALS.map((g) => g.id));

function businessTypeLabel(id: string, tb: (k: string) => string): string {
  return KNOWN_BUSINESS_TYPE_IDS.has(id) ? tb(id) : id;
}

function goalLabel(id: string, tg: (k: string) => string): string {
  return KNOWN_GOAL_IDS.has(id) ? tg(`goal_${id}`) : id;
}

function timeAgo(dateStr: string, t: (k: string, v?: Record<string, number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minsAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hrsAgo", { n: hrs });
  return t("daysAgo", { n: Math.floor(hrs / 24) });
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tg = await getTranslations("generate");
  const tb = await getTranslations("businesses");
  const th = await getTranslations("history");

  const user = await getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-black">
        <NavBar />
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t("subtitle")}
            </p>
          </div>
          <DashboardSignInPrompt />
        </div>
      </main>
    );
  }

  const stats = await getDashboardStats(user.id);
  const usedChannels = new Set(stats.channelsUsed);
  const numberFmt = new Intl.NumberFormat();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />

      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Stat row */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { key: "campaigns", label: t("statCampaigns"), value: stats.campaigns },
            { key: "segments", label: t("statSegments"), value: stats.segments },
            { key: "channels", label: t("statChannels"), value: stats.channelsUsed.length },
          ].map((s) => (
            <div
              key={s.key}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center dark:border-zinc-700 dark:bg-zinc-900"
            >
              <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {numberFmt.format(s.value)}
              </span>
              <span className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Channel coverage */}
        <div className="mb-6 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {t("channelCoverageTitle")}
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("channelCoverageDesc")}
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUPPORTED_CHANNELS.map((ch) => {
              const used = usedChannels.has(ch.id);
              return (
                <div
                  key={ch.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    used
                      ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40"
                  }`}
                >
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {tg(`channel_${ch.id}`)}
                  </span>
                  {used ? (
                    <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                      {t("channelUsedBadge")}
                    </span>
                  ) : (
                    <Link
                      href="/generate"
                      className="shrink-0 rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                    >
                      {t("channelTryCta")}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Benchmark context */}
        {stats.benchmark && (stats.benchmark.avgChannelsPerCampaign !== undefined || stats.benchmark.mostCommonGoal) && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-100/60 p-5 text-center sm:p-7 dark:border-zinc-800 dark:bg-zinc-900/40">
            {stats.benchmark.avgChannelsPerCampaign !== undefined && (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {t("benchmarkChannelsLine", {
                  avg: stats.benchmark.avgChannelsPerCampaign,
                  count: stats.channelsUsed.length,
                })}
              </p>
            )}
            {stats.benchmark.mostCommonGoal && (
              <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t("benchmarkGoalLine", {
                  goal: goalLabel(stats.benchmark.mostCommonGoal, tg),
                })}
              </p>
            )}
          </div>
        )}

        {/* Recent activity */}
        <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {t("recentActivityTitle")}
            </h2>
            <Link href="/history" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              {t("viewFullHistory")}
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">{t("recentActivityEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.recent.map((item, i) => (
                <li key={`${item.type}-${item.created_at}-${i}`} className="flex items-center gap-3">
                  <span className="text-xl">{item.type === "campaign" ? "📣" : "🔍"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {item.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {item.type === "campaign" ? t("recentCampaignLabel") : t("recentSegmentLabel")}
                      {item.business_type ? ` · ${businessTypeLabel(item.business_type, tb)}` : ""}
                      {" · "}
                      {timeAgo(item.created_at, th)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
