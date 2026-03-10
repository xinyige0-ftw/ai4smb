"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import Papa from "papaparse";
import { summarizeCsv, stripPiiFromSummary } from "@/lib/segment-prompts";
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

export default function POSPaste({ onBack }: { onBack: () => void }) {
  const locale = useLocale();
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [step, setStep] = useState<"paste" | "preview">("paste");

  function handleParse() {
    setError("");
    const parsed = Papa.parse<string[]>(pastedText.trim(), { skipEmptyLines: true });
    const allRows = parsed.data;
    if (allRows.length < 2) {
      setError("Couldn't detect any rows. Make sure the data has headers in the first row.");
      return;
    }
    const headers = allRows[0];
    const rows = allRows.slice(1).filter((r) => r.some((c) => c?.trim()));
    if (rows.length === 0) {
      setError("No data rows found after the header.");
      return;
    }
    setPreviewHeaders(headers);
    setPreviewRows(rows);
    setRowCount(rows.length);
    setStep("preview");
  }

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      const anonId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
          : "unknown";

      const rawSummary = summarizeCsv(previewHeaders, previewRows);
      const summary = stripPiiFromSummary(rawSummary);

      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, mode: "csv", summary, locale }),
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
        meta={{ rowCount, columnCount: previewHeaders.length }}
        metaLabel={`${rowCount} transactions analyzed from your POS data`}
        onStartOver={onBack}
        onReanalyze={handleAnalyze}
        loading={loading}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Paste Transaction Data
      </h1>
      <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
        Copy from Square, Clover, Toast, or any spreadsheet and paste it below
      </p>

      {step === "paste" && (
        <>
          {/* How-to */}
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">How to export your data</p>
            <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <p>🟦 <strong>Square:</strong> Dashboard → Reports → Transactions → Export → copy the table</p>
              <p>🟠 <strong>Clover:</strong> Dashboard → Reports → Sales Summary → export CSV</p>
              <p>📊 <strong>Spreadsheet:</strong> Select your data including headers → Ctrl/Cmd+C → paste below</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <textarea
              placeholder="Paste your transaction data here (with headers in the first row):

Date	Amount	Item	Customer Type
2026-02-01	$45.00	Coffee + Pastry	Regular
2026-02-01	$12.50	Latte	New
2026-02-02	$89.00	Catering Order	Business"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 font-mono text-xs leading-relaxed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <VoiceInput onTranscript={(t) => setPastedText((v) => v + (v ? " " : "") + t)} className="mt-1" />
          </div>

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button onClick={onBack} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">Back</button>
            <button
              onClick={handleParse}
              disabled={!pastedText.trim()}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Preview data →
            </button>
          </div>
        </>
      )}

      {step === "preview" && (
        <>
          <p className="mb-4 text-center text-zinc-500 dark:text-zinc-400">
            {rowCount} rows detected across {previewHeaders.length} columns
          </p>

          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    {previewHeaders.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      {row.map((cell, j) => (
                        <td key={j} className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rowCount > 5 && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                + {rowCount - 5} more rows
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep("paste")} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">Back</button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? (
                <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Analyzing...</>
              ) : "Analyze my transactions"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
