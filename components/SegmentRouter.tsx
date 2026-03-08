"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SegmentHub from "./SegmentHub";
import type { Mode } from "./SegmentHub";
import SegmentWizard from "./SegmentWizard";
import InterviewMode from "./InterviewMode";
import BenchmarkMode from "./BenchmarkMode";
import ReviewAnalysis from "./ReviewAnalysis";
import POSPaste from "./POSPaste";
import SocialAnalysis from "./SocialAnalysis";
import TeachMeMode from "./TeachMeMode";

interface SubChoiceOption {
  icon: string;
  label: string;
  target: Mode;
}

function SubChoice({
  title,
  options,
  onSelect,
  onBack,
}: {
  title: string;
  options: SubChoiceOption[];
  onSelect: (mode: Mode) => void;
  onBack: () => void;
}) {
  const c = useTranslations("common");

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <button
        onClick={onBack}
        className="mb-4 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← {c("back")}
      </button>
      <h2 className="mb-6 text-center text-xl font-bold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="grid gap-3">
        {options.map((opt) => (
          <button
            key={opt.target}
            onClick={() => onSelect(opt.target)}
            className="group flex items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500"
          >
            <span className="text-xl">{opt.icon}</span>
            <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {opt.label}
            </span>
            <span className="text-zinc-300 group-hover:text-blue-500 dark:text-zinc-600 dark:group-hover:text-blue-400">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SegmentRouter() {
  const [mode, setMode] = useState<Mode | null>(null);
  const t = useTranslations("segment");

  const back = () => setMode(null);

  const askOptions: SubChoiceOption[] = [
    { icon: "💬", label: t("askQuestions"), target: "interview" },
    { icon: "📈", label: t("showBenchmarks"), target: "benchmark" },
    { icon: "🤖", label: t("guideMeThrough"), target: "teachme" },
  ];

  const dataOptions: SubChoiceOption[] = [
    { icon: "📁", label: t("uploadCsv"), target: "csv" },
    { icon: "📋", label: t("pasteTransactions"), target: "pos" },
  ];

  const textOptions: SubChoiceOption[] = [
    { icon: "⭐", label: t("pasteReviews"), target: "reviews" },
    { icon: "📱", label: t("pasteSocial"), target: "social" },
  ];

  if (mode === null) return <SegmentHub onSelect={setMode} />;

  if (mode === "ask")
    return (
      <SubChoice
        title="How would you like to start?"
        options={askOptions}
        onSelect={setMode}
        onBack={back}
      />
    );
  if (mode === "data")
    return (
      <SubChoice
        title="What kind of data do you have?"
        options={dataOptions}
        onSelect={setMode}
        onBack={back}
      />
    );
  if (mode === "text")
    return (
      <SubChoice
        title="What would you like to analyze?"
        options={textOptions}
        onSelect={setMode}
        onBack={back}
      />
    );

  if (mode === "csv") return <SegmentWizard onBack={back} />;
  if (mode === "interview") return <InterviewMode onBack={back} />;
  if (mode === "benchmark") return <BenchmarkMode onBack={back} />;
  if (mode === "reviews") return <ReviewAnalysis onBack={back} />;
  if (mode === "pos") return <POSPaste onBack={back} />;
  if (mode === "social") return <SocialAnalysis onBack={back} />;
  if (mode === "teachme") return <TeachMeMode onBack={back} />;

  return <SegmentHub onSelect={setMode} />;
}
