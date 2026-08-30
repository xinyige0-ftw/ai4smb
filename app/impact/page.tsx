import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";
import { getImpactStats } from "@/app/api/impact/route";

export const metadata: Metadata = {
  title: "Impact — AI4SMB Insights",
  description: "Live usage numbers pulled directly from the AI4SMB Insights platform database.",
};

interface StatCard {
  key: string;
  label: string;
  value: string;
}

export default async function ImpactPage() {
  const t = await getTranslations("impact");
  const stats = await getImpactStats();

  const numberFmt = new Intl.NumberFormat();

  const cards: StatCard[] = [];

  if (stats.campaigns !== undefined) {
    cards.push({ key: "campaigns", label: t("statCampaigns"), value: numberFmt.format(stats.campaigns) });
  }
  if (stats.segments !== undefined) {
    cards.push({ key: "segments", label: t("statSegments"), value: numberFmt.format(stats.segments) });
  }
  if (stats.businessTypes !== undefined) {
    cards.push({ key: "businessTypes", label: t("statBusinessTypes"), value: numberFmt.format(stats.businessTypes) });
  }
  if (stats.locations !== undefined) {
    cards.push({ key: "locations", label: t("statLocations"), value: numberFmt.format(stats.locations) });
  }
  if (stats.reviews?.averageRating !== undefined) {
    cards.push({ key: "averageRating", label: t("statAverageRating"), value: `${stats.reviews.averageRating}` });
  }
  if (stats.reviews?.nps !== undefined) {
    cards.push({ key: "nps", label: t("statNps"), value: `${stats.reviews.nps}` });
  }

  const hasAnyCard = cards.length > 0;
  const hasHoursSaved = stats.hoursSaved !== undefined;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />

      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Stat grid */}
        {hasAnyCard ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.key}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center sm:p-7 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                  {card.value}
                  {card.key === "averageRating" && (
                    <span className="ml-1 text-sm font-medium text-zinc-400 dark:text-zinc-500">{t("ratingOutOf")}</span>
                  )}
                </span>
                <span className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center text-sm text-zinc-500 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {t("emptyNote")}
          </div>
        )}

        {/* Time estimate — quieter, clearly labelled block */}
        {hasHoursSaved && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-100/60 p-5 text-center sm:p-7 dark:border-zinc-800 dark:bg-zinc-900/40">
            <span className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
              {t("hoursValue", { count: numberFmt.format(stats.hoursSaved as number) })}
            </span>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
              {t("timeEstimateTitle")}
            </p>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
              {t("timeEstimateDisclaimer")}
            </p>
          </div>
        )}

        {/* How these numbers are produced */}
        <div className="mt-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {t("howProducedTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("howProducedBody")}
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
          {t("updatedNote", { date: new Date(stats.updatedAt).toLocaleString() })}
        </p>
      </div>
    </main>
  );
}
