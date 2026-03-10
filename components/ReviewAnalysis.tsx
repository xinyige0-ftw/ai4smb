"use client";

import { useState, useRef } from "react";
import { useLocale } from "next-intl";
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

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  totalRatings: number;
}

interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  time: string;
}

export default function ReviewAnalysis({ onBack }: { onBack: () => void }) {
  const locale = useLocale();
  const [reviewText, setReviewText] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; rating: number; totalRatings: number } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    setSearchResults([]);
    setSelectedPlace(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) return;

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) setSearchResults(data.results);
      } catch { /* silent */ }
      setSearching(false);
    }, 400);
  }

  async function handleSelectPlace(place: PlaceResult) {
    setSearchResults([]);
    setSearchQuery(place.name);
    setSelectedPlace({ name: place.name, rating: place.rating, totalRatings: place.totalRatings });
    setFetchingReviews(true);
    setError("");

    try {
      const res = await fetch(`/api/places/reviews?placeId=${encodeURIComponent(place.placeId)}`);
      const data = await res.json();
      if (data.reviews?.length) {
        const formatted = data.reviews
          .map((r: PlaceReview) => `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} (${r.author}, ${r.time})\n"${r.text}"`)
          .join("\n\n");
        setReviewText(formatted);
      } else {
        setError("No reviews found for this business.");
      }
    } catch {
      setError("Failed to fetch reviews. You can still paste them manually.");
    }
    setFetchingReviews(false);
  }

  async function handleAnalyze() {
    if (!reviewText.trim()) return;
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
          mode: "reviews",
          reviewText,
          businessType: businessType || undefined,
          locale,
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
        metaLabel="Based on your customer reviews"
        onStartOver={onBack}
        onReanalyze={handleAnalyze}
        loading={loading}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Analyze Your Reviews
      </h1>
      <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
        Paste your Google or Yelp reviews — the AI finds patterns in what customers say
      </p>

      {/* Google Places search */}
      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <p className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
          🔍 Find your business on Google
        </p>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type your business name and city..."
            className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          {searching && (
            <div className="absolute right-3 top-2.5">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              {searchResults.map((p) => (
                <button
                  key={p.placeId}
                  onClick={() => handleSelectPlace(p)}
                  className="flex w-full flex-col gap-0.5 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-blue-50 dark:border-zinc-700 dark:hover:bg-zinc-700"
                >
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {p.address}
                    {p.rating ? ` · ⭐ ${p.rating} (${p.totalRatings} reviews)` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {fetchingReviews && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-300">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            Pulling reviews from Google...
          </div>
        )}
        {selectedPlace && !fetchingReviews && reviewText && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            ✓ Found {reviewText.split("\n\n").length} reviews for {selectedPlace.name}
          </div>
        )}
        <p className="mt-2 text-xs text-blue-600/70 dark:text-blue-400/70">
          We&apos;ll pull up to 10 Google reviews automatically. Paste more below for deeper insights.
        </p>
      </div>

      {/* Manual paste fallback */}
      <div className="flex items-start gap-1.5">
        <textarea
          placeholder="Reviews will appear here after searching, or paste manually...

Example:
★★★★★ 'Best coffee in the neighborhood! The baristas remember my order.'

★★★★☆ 'Quick stop on my work commute. Usually grab a latte and a croissant.'"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={10}
          className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm leading-relaxed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <VoiceInput onTranscript={(t) => setReviewText((v) => v + (v ? " " : "") + t)} className="mt-1" />
      </div>
      <p className="mt-1 text-right text-xs text-zinc-400">
        {reviewText.length} characters {reviewText.length > 8000 && "· extra text will be trimmed"}
      </p>

      {/* Optional business type */}
      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Business type (optional — helps with context)
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
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
        >
          Back
        </button>
        <button
          onClick={handleAnalyze}
          disabled={!reviewText.trim() || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
        >
          {loading ? (
            <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Analyzing reviews...</>
          ) : "Analyze my reviews"}
        </button>
      </div>
    </div>
  );
}
