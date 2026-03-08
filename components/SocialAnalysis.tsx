"use client";

import { useState } from "react";
import { BUSINESS_TYPES } from "@/lib/prompts";
import SegmentResults from "./SegmentResults";
import VoiceInput from "./VoiceInput";

interface SegmentData {
  summary: string;
  segments: {
    name: string; percentage: number; color: string;
    description: string; characteristics: string[]; size: number; recommendations: string[];
  }[];
  quickWins: string[];
  dataQuality: string;
}

export default function SocialAnalysis({ onBack }: { onBack: () => void }) {
  const [socialContent, setSocialContent] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!socialContent.trim()) return;
    setLoading(true);
    setError("");
    try {
      const anonId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
          : "unknown";

      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonId,
          mode: "social",
          socialContent,
          businessType: businessType || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data.result);
      setResultId(data.id || null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <SegmentResults
        result={result}
        resultId={resultId}
        meta={{ rowCount: 0, columnCount: 0 }}
        metaLabel="Based on your social media content"
        onStartOver={onBack}
        onReanalyze={handleAnalyze}
        loading={loading}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Social Audience Analysis
      </h1>
      <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
        Paste your bio, recent posts, and comments — the AI identifies who engages with your brand
      </p>

      {/* Tips */}
      <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">What to include</p>
        <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <p>✅ Your Instagram, Facebook, RedNote (小红书), or WeChat bio</p>
          <p>✅ 5-10 recent post captions that got engagement</p>
          <p>✅ A few comments from followers (especially recurring ones)</p>
          <p>✅ Your follower count and any demographics you know</p>
          <p>✅ Which posts performed best vs. worst</p>
          <p>✅ RedNote note titles, saves/likes counts, or WeChat Moments/article reads</p>
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        <textarea
          placeholder="Paste your social content here...

Example:
Bio: 'Austin's favorite neighborhood coffee shop ☕ | Fresh pastries daily | Dog-friendly patio'

Post 1 (92 likes): 'Your Monday needs our oat milk latte and a sunny patio seat 🌞'
Comments: 'My morning ritual!' / 'Best spot to WFH' / 'Bringing my pup tomorrow!'

Post 2 (45 likes): 'New seasonal menu dropping this Friday — pumpkin everything 🎃'
Comments: 'Already planning my visit' / 'Love your fall drinks'

Post 3 (210 likes): 'Huge thanks to everyone who came out to our 5-year anniversary party last night! 🎉'"
          value={socialContent}
          onChange={(e) => setSocialContent(e.target.value)}
          rows={12}
          className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-relaxed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <VoiceInput onTranscript={(t) => setSocialContent((v) => v + (v ? " " : "") + t)} className="mt-1" />
      </div>
      <p className="mt-1 text-right text-xs text-zinc-400">
        {socialContent.length} characters {socialContent.length > 5000 && "· extra text will be trimmed"}
      </p>

      {/* Optional business type */}
      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Business type (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.filter(b => b.id !== "other").map((bt) => (
            <button
              key={bt.id}
              onClick={() => setBusinessType(businessType === bt.id ? "" : bt.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${businessType === bt.id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300"}`}
            >
              {bt.icon} {bt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>
      )}

      <div className="mt-5 flex gap-3">
        <button onClick={onBack} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">Back</button>
        <button
          onClick={handleAnalyze}
          disabled={!socialContent.trim() || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Analyzing...</>
          ) : "Analyze my audience"}
        </button>
      </div>
    </div>
  );
}
