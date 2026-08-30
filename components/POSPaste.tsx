"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Papa from "papaparse";
import { summarizeCsv, stripPiiFromSummary, analyzeRedaction, type RedactionReport } from "@/lib/segment-prompts";
import SegmentResults from "./SegmentResults";
import PrivacyRedactionNotice from "./PrivacyRedactionNotice";
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
  const t = useTranslations("posPaste");
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [step, setStep] = useState<"paste" | "preview">("paste");
  const [redactionReport, setRedactionReport] = useState<RedactionReport | null>(null);

  function handleParse() {
    setError("");
    const parsed = Papa.parse<string[]>(pastedText.trim(), { skipEmptyLines: true });
    const allRows = parsed.data;
    if (allRows.length < 2) {
      setError(t("errorNoRows"));
      return;
    }
    const headers = allRows[0];
    const rows = allRows.slice(1).filter((r) => r.some((c) => c?.trim()));
    if (rows.length === 0) {
      setError(t("errorNoData"));
      return;
    }
    setPreviewHeaders(headers);
    setPreviewRows(rows);
    setRowCount(rows.length);
    setRedactionReport(analyzeRedaction(headers, rows));
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
      if (!res.ok) { setError(data.error || t("errorGeneric")); return; }
      setResult(data.result);
      setResultId(data.id || null);
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <>
        {redactionReport && (
          <div className="mx-auto w-full max-w-2xl px-3 pt-6 sm:px-4 sm:pt-8">
            <PrivacyRedactionNotice report={redactionReport} />
          </div>
        )}
        <SegmentResults
          result={result}
          resultId={resultId}
          meta={{ rowCount, columnCount: previewHeaders.length }}
          metaLabel={t("metaLabel", { count: rowCount })}
          onStartOver={onBack}
          onReanalyze={handleAnalyze}
          loading={loading}
        />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
        {t("subtitle")}
      </p>

      {step === "paste" && (
        <>
          {/* How-to */}
          <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("howToExport")}</p>
            <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <p>🟦 <strong>Square:</strong> {t("squareSteps")}</p>
              <p>🟠 <strong>Clover:</strong> {t("cloverSteps")}</p>
              <p>📊 <strong>{t("spreadsheet")}:</strong> {t("spreadsheetSteps")}</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <textarea
              placeholder={t("placeholder")}
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
            <button onClick={onBack} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">{t("back")}</button>
            <button
              onClick={handleParse}
              disabled={!pastedText.trim()}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t("previewBtn")}
            </button>
          </div>
        </>
      )}

      {step === "preview" && (
        <>
          <p className="mb-4 text-center text-zinc-500 dark:text-zinc-400">
            {t("rowsDetected", { rows: rowCount, cols: previewHeaders.length })}
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
                + {rowCount - 5} {t("moreRows")}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep("paste")} className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300">{t("back")}</button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? (
                <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{t("analyzing")}</>
              ) : t("analyzeBtn")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
