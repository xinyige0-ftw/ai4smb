"use client";

import { useState } from "react";
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [campaign, setCampaign] = useState<CampaignData | null>(null);

  const [businessType, setBusinessType] = useState("");
  const [businessTypeCustom, setBusinessTypeCustom] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showName, setShowName] = useState(false);

  const [goal, setGoal] = useState("");
  const [budget, setBudget] = useState("any");
  const [channels, setChannels] = useState<string[]>(["smart"]);
  const [details, setDetails] = useState("");
  const [showDetails, setShowDetails] = useState(false);

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

    const input: GenerateInput = {
      businessType,
      businessTypeCustom: businessType === "other" ? businessTypeCustom : undefined,
      businessName: businessName || undefined,
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
        body: JSON.stringify({ anonId, input }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setCampaign(data.campaign);
      setStep(3);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === 3 && campaign) {
    return (
      <CampaignResults
        campaign={campaign}
        onRegenerate={handleGenerate}
        onStartOver={() => {
          setStep(1);
          setCampaign(null);
          setBusinessType("");
          setBusinessTypeCustom("");
          setBusinessName("");
          setShowName(false);
          setGoal("");
          setBudget("any");
          setChannels(["smart"]);
          setDetails("");
          setShowDetails(false);
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
            What&apos;s your business?
          </h1>
          <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
            Tap one to get started
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt.id}
                onClick={() => {
                  setBusinessType(bt.id);
                  if (bt.id !== "other") setStep(2);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all active:scale-95
                  ${businessType === bt.id
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                  }`}
              >
                <span className="text-2xl">{bt.icon}</span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{bt.label}</span>
              </button>
            ))}
          </div>

          {businessType === "other" && (
            <div className="mt-4">
              <input
                type="text"
                placeholder="Describe your business in a few words..."
                value={businessTypeCustom}
                onChange={(e) => setBusinessTypeCustom(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                autoFocus
              />
              <button
                onClick={() => businessTypeCustom.trim() && setStep(2)}
                disabled={!businessTypeCustom.trim()}
                className="mt-3 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {!showName && businessType !== "other" && (
            <button
              onClick={() => setShowName(true)}
              className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              + Add your business name (optional)
            </button>
          )}
          {showName && (
            <input
              type="text"
              placeholder="e.g. Sunrise Bakery"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            What do you need?
          </h1>
          <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
            Pick a goal, then hit create
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
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{g.label}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{g.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Budget */}
          <div className="mb-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Budget</div>
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
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="mb-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Where to post</div>
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
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional details */}
          {!showDetails ? (
            <button
              onClick={() => setShowDetails(true)}
              className="mb-6 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              + Any details you&apos;d like to add? (optional)
            </button>
          ) : (
            <textarea
              placeholder="e.g. We're open late on Fridays, our specialty is gluten-free"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="mb-6 w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}

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
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={!goal || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                "Create my campaign"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
