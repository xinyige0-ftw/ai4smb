"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { BUSINESS_TYPES, GOALS, BUDGETS, CHANNELS, type GenerateInput } from "@/lib/prompts";
import CampaignResults from "./CampaignResults";

type CampaignData = {
  strategy: string;
  channels: {
    channel: string;
    why: string;
    content: Record<string, unknown>;
  }[];
};

export default function GenerateWizard() {
  const t = useTranslations("generate");
  const tb = useTranslations("businesses");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const [businessType, setBusinessType] = useState("");
  const [businessTypeCustom, setBusinessTypeCustom] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");

  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("");
  const [channels, setChannels] = useState<string[]>(["smart"]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ai4smb_prefs");
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (prefs.businessType) setBusinessType(prefs.businessType);
      if (prefs.channels?.length) setChannels(prefs.channels);
      if (prefs.location) setLocation(prefs.location);
    } catch { /* ignore corrupt data */ }
  }, []);

  function toggleChannel(id: string) {
    if (id === "smart") {
      setChannels(["smart"]);
      return;
    }
    setChannels((prev) => {
      const without = prev.filter((c) => c !== "smart" && c !== id);
      if (prev.includes(id)) return without.length ? without : ["smart"];
      return [...without, id];
    });
  }

  async function handleGenerate() {
    if (!goal) return;
    setLoading(true);
    setError("");
    setCampaign(null);
    setCampaignId(null);

    try {
      const prev = JSON.parse(localStorage.getItem("ai4smb_prefs") || "{}");
      localStorage.setItem("ai4smb_prefs", JSON.stringify({ ...prev, businessType, location }));
    } catch { /* ignore */ }

    const input: GenerateInput = {
      businessType,
      businessTypeCustom: businessType === "other" ? businessTypeCustom : undefined,
      businessName: businessName || undefined,
      location: location || undefined,
      goal,
      budget,
      channels,
      details: details || undefined,
    };

    try {
      const anonId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
          : "unknown";

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, input, locale }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tc("errorGeneric"));
        return;
      }
      setCampaign(data.campaign);
      setCampaignId(data.id || null);
      setStep(3);
    } catch {
      setError(tc("networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (step === 3 && campaign) {
    return (
      <CampaignResults
        campaign={campaign}
        campaignId={campaignId}
        onRegenerate={handleGenerate}
        onStartOver={() => {
          setStep(1);
          setCampaign(null);
          setCampaignId(null);
          setBusinessType("");
          setBusinessTypeCustom("");
          setBusinessName("");
          setGoal("");
          setBudget("");
          setChannels(["smart"]);
          setDetails("");
        }}
        onAdjust={() => setStep(2)}
        loading={loading}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-3 text-sm">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step >= 1 ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700"}`}>1</span>
        <span className={`h-0.5 w-8 ${step >= 2 ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-700"}`} />
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step >= 2 ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700"}`}>2</span>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("wizardTitle")}
          </h1>
          <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
            {t("wizardSubtitle")}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt.id}
                onClick={() => setBusinessType(bt.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all active:scale-95
                  ${businessType === bt.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                  }`}
              >
                <span className="text-2xl">{bt.icon}</span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{tb(bt.id)}</span>
              </button>
            ))}
          </div>

          {businessType === "other" && (
            <input
              type="text"
              placeholder={t("customPlaceholder")}
              value={businessTypeCustom}
              onChange={(e) => setBusinessTypeCustom(e.target.value)}
              className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              autoFocus
            />
          )}

          {/* Text fields appear after business type is selected */}
          {businessType && (businessType !== "other" || businessTypeCustom.trim()) && (
            <div className="mt-5 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("businessNameLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("businessNamePlaceholder")}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-sm dark:bg-zinc-800 dark:text-zinc-100 ${!businessName.trim() ? "border-red-300 dark:border-red-700" : "border-zinc-300 dark:border-zinc-600"}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("locationLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("locationPlaceholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-sm dark:bg-zinc-800 dark:text-zinc-100 ${!location.trim() ? "border-red-300 dark:border-red-700" : "border-zinc-300 dark:border-zinc-600"}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t("detailsLabel")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder={t("detailsPlaceholder")}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  className={`w-full rounded-lg border px-4 py-3 text-sm dark:bg-zinc-800 dark:text-zinc-100 ${!details.trim() ? "border-red-300 dark:border-red-700" : "border-zinc-300 dark:border-zinc-600"}`}
                />
              </div>

              <button
                onClick={() => {
                  if (!businessType || !location.trim() || !businessName.trim() || !details.trim()) return;
                  if (businessType === "other" && !businessTypeCustom.trim()) return;
                  setStep(2);
                }}
                disabled={!businessType || !location.trim() || !businessName.trim() || !details.trim() || (businessType === "other" && !businessTypeCustom.trim())}
                className="mt-1 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t("continue")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("step2Title")}
          </h1>
          <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
            {t("step2SubtitlePick")}
          </p>

          {/* Goals */}
          <div className="mb-6 flex flex-col gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98]
                  ${goal === g.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                  }`}
              >
                <span className="text-xl">{g.icon}</span>
                <div>
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{t(`goal_${g.id}`)}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{t(`goalDesc_${g.id}`)}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Budget */}
          <div className="mb-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("budgetLabel")}</div>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBudget(b.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all
                    ${budget === b.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                >
                  {t(`budget_${b.id}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="mb-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("channelsLabel")}</div>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all
                    ${channels.includes(ch.id)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500"
                    }`}
                >
                  {t(`channel_${ch.id}`)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
            >
              {tc("back")}
            </button>
            <button
              onClick={handleGenerate}
              disabled={!goal || !budget || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("creating")}
                </>
              ) : (
                t("createCampaign")
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
