"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export interface ReviewSubmitData {
  rating: number;
  npsScore: number | null;
  text: string;
  displayName: string;
  email: string;
  businessType: string;
  location: string;
  isAnonymous: boolean;
  consentDisplay: boolean;
  consentContact: boolean;
  toolsUsed: string[];
  campaignsCount: number;
  segmentsCount: number;
}

interface ReviewPromptProps {
  onClose: () => void;
  onSubmit: (data: ReviewSubmitData) => void;
  businessType?: string;
  location?: string;
  toolsUsed?: string[];
  campaignsCount?: number;
  segmentsCount?: number;
  userEmail?: string;
  userName?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-8 w-8 text-yellow-400">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.2} className="h-8 w-8 text-zinc-300 dark:text-zinc-600">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  );
}

export default function ReviewPrompt({
  onClose,
  onSubmit,
  businessType = "",
  location = "",
  toolsUsed = [],
  campaignsCount = 0,
  segmentsCount = 0,
  userEmail = "",
  userName = "",
}: ReviewPromptProps) {
  const t = useTranslations("review");
  const hasUserInfo = !!(userEmail || userName);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [hoveredNps, setHoveredNps] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [isAnonymous, setIsAnonymous] = useState(!hasUserInfo);
  const [consentDisplay, setConsentDisplay] = useState(hasUserInfo);
  const [consentContact, setConsentContact] = useState(false);

  const maxChars = 500;

  function handleSubmit() {
    onSubmit({
      rating,
      npsScore,
      text,
      displayName: isAnonymous ? "" : displayName,
      email: isAnonymous ? "" : email,
      businessType,
      location,
      isAnonymous,
      consentDisplay,
      consentContact,
      toolsUsed,
      campaignsCount,
      segmentsCount,
    });
  }

  function getNpsLabel(score: number | null): string {
    if (score === null) return "";
    if (score <= 6) return t("detractor");
    if (score <= 8) return t("passive");
    return t("promoter");
  }

  function getNpsColor(score: number | null): string {
    if (score === null) return "";
    if (score <= 6) return "text-rose-500";
    if (score <= 8) return "text-amber-500";
    return "text-green-500";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <h2 className="mb-5 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {t("promptTitle")}
        </h2>

        {/* Usage context */}
        {(campaignsCount > 0 || segmentsCount > 0 || toolsUsed.length > 0) && (
          <div className="mb-5 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("sessionLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {businessType && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  {businessType}
                </span>
              )}
              {location && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  📍 {location}
                </span>
              )}
              {campaignsCount > 0 && (
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                  {t("campaignCount", { count: campaignsCount })}
                </span>
              )}
              {segmentsCount > 0 && (
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {t("segmentCount", { count: segmentsCount })}
                </span>
              )}
              {toolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                >
                  {t.has(`tool_${tool}`) ? t(`tool_${tool}`) : tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Star rating */}
        <div className="mb-5">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-transform hover:scale-110"
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <StarIcon filled={star <= (hoveredStar || rating)} />
              </button>
            ))}
          </div>
        </div>

        {/* NPS question */}
        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("npsQuestion")}
          </label>
          <div className="flex gap-1">
            {Array.from({ length: 11 }, (_, i) => i).map((score) => {
              const isActive = npsScore !== null && score <= npsScore;
              const isHovered = hoveredNps !== null && score <= hoveredNps;
              const showFill = isHovered || (!hoveredNps && isActive);

              let bg = "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
              if (showFill) {
                if ((hoveredNps ?? npsScore ?? 0) <= 6) bg = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
                else if ((hoveredNps ?? npsScore ?? 0) <= 8) bg = "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
                else bg = "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
              }

              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  onMouseEnter={() => setHoveredNps(score)}
                  onMouseLeave={() => setHoveredNps(null)}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-semibold transition-all hover:scale-105 ${bg}`}
                >
                  {score}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
            <span>{t("npsLow")}</span>
            <span>{t("npsHigh")}</span>
          </div>
          {npsScore !== null && (
            <p className={`mt-1 text-center text-xs font-medium ${getNpsColor(npsScore)}`}>
              {getNpsLabel(npsScore)} ({npsScore}/10)
            </p>
          )}
        </div>

        {/* Review text */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("textPlaceholder")}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxChars))}
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            placeholder={t("textInputPlaceholder")}
          />
          <p className="mt-1 text-right text-xs text-zinc-400 dark:text-zinc-500">
            {text.length}/{maxChars}
          </p>
        </div>

        {/* Identity toggle */}
        <div className="mb-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t("identityLabel")}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAnonymous(true)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isAnonymous
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {t("anonymous")}
            </button>
            <button
              onClick={() => setIsAnonymous(false)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                !isAnonymous
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {t("showName")}
            </button>
          </div>
        </div>

        {/* Name and email (visible only when not anonymous) */}
        {!isAnonymous && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("nameLabel")}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("emailLabel")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder={t("emailPlaceholder")}
              />
            </div>
          </div>
        )}

        {/* Consent checkboxes */}
        <div className="mb-5 space-y-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentDisplay}
              onChange={(e) => setConsentDisplay(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
            />
            <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {!isAnonymous ? t("consentDisplayNamed") : t("consentDisplay")}
            </span>
          </label>
          {!isAnonymous && email && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentContact}
                onChange={(e) => setConsentContact(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
              />
              <span className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t("consentContact")}
              </span>
            </label>
          )}
        </div>

        <button
          disabled={rating === 0}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("submit")}
        </button>

        <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
          {t("privacyNote")}
        </p>
      </div>
    </div>
  );
}
