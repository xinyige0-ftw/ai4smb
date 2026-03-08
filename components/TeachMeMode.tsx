"use client";

import { useState } from "react";
import { TEACH_ME_QUESTIONS, type TeachMeQA } from "@/lib/insight-prompts";
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

export default function TeachMeMode({ onBack }: { onBack: () => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(TEACH_ME_QUESTIONS.length).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const currentAnswer = answers[currentQ] || "";
  const isLastQuestion = currentQ === TEACH_ME_QUESTIONS.length - 1;
  const canProceed = currentAnswer.trim().length > 5;

  function handleAnswer(val: string) {
    const updated = [...answers];
    updated[currentQ] = val;
    setAnswers(updated);
  }

  function handleNext() {
    if (!canProceed) return;
    if (isLastQuestion) {
      handleAnalyze();
    } else {
      setCurrentQ(currentQ + 1);
    }
  }

  function handleBack() {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    } else {
      onBack();
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      const anonId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
          : "unknown";

      const qas: TeachMeQA[] = TEACH_ME_QUESTIONS.map((q, i) => ({
        question: q,
        answer: answers[i] || "(no answer)",
      }));

      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, mode: "teachme", conversation: { qas } }),
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
        metaLabel="Based on your guided consultation answers"
        onStartOver={onBack}
        onReanalyze={handleAnalyze}
        loading={loading}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900">
          🤖
        </div>
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Your AI Consultant
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          {TEACH_ME_QUESTIONS.length} questions about your customers. Takes about 2 minutes.
        </p>
      </div>

      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {TEACH_ME_QUESTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => answers[i] && setCurrentQ(i)}
            className={`h-2.5 rounded-full transition-all ${i === currentQ ? "w-6 bg-blue-600" : i < currentQ ? "w-2.5 bg-blue-400" : "w-2.5 bg-zinc-200 dark:bg-zinc-700"}`}
          />
        ))}
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        {/* Question counter */}
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-500">
          Question {currentQ + 1} of {TEACH_ME_QUESTIONS.length}
        </div>

        {/* AI avatar + question */}
        <div className="mb-5 flex items-start gap-3">
          <div className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            AI
          </div>
          <p className="text-base font-medium leading-relaxed text-zinc-800 dark:text-zinc-100">
            {TEACH_ME_QUESTIONS[currentQ]}
          </p>
        </div>

        {/* Answer textarea */}
        <div className="flex items-start gap-1.5">
          <textarea
            key={currentQ}
            value={currentAnswer}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={4}
            autoFocus
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder-zinc-400 focus:border-blue-400 focus:bg-white focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canProceed) {
                handleNext();
              }
            }}
          />
          <VoiceInput onTranscript={(t) => handleAnswer(currentAnswer + (currentAnswer ? " " : "") + t)} className="mt-1" />
        </div>
        <p className="mt-1 text-right text-xs text-zinc-400">
          {canProceed ? "⌘/Ctrl+Enter to continue" : ""}
        </p>
      </div>

      {/* Previously answered (collapsed summary) */}
      {currentQ > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Your answers so far
          </p>
          <div className="space-y-2">
            {answers.slice(0, currentQ).map((ans, i) =>
              ans ? (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="flex-shrink-0 font-medium text-zinc-400">Q{i + 1}:</span>
                  <span className="truncate text-zinc-600 dark:text-zinc-400">{ans}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>
      )}

      {/* Navigation */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={handleBack}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Building your segments...</>
          ) : isLastQuestion ? (
            "Generate my segments →"
          ) : (
            "Next question →"
          )}
        </button>
      </div>
    </div>
  );
}
