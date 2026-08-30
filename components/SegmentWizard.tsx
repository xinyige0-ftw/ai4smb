"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import Papa from "papaparse";
import SegmentResults from "./SegmentResults";
import PrivacyRedactionNotice from "./PrivacyRedactionNotice";
import { SAMPLE_HEADERS, SAMPLE_ROWS } from "@/lib/sample-data";
import { summarizeCsv, stripPiiFromSummary, analyzeRedaction, type RedactionReport } from "@/lib/segment-prompts";

interface SegmentData {
  summary: string;
  segments: {
    name: string;
    percentage: number;
    color: string;
    description: string;
    characteristics: string[];
    size: number;
    recommendations: string[];
  }[];
  quickWins: string[];
  dataQuality: string;
}

export default function SegmentWizard({ onBack }: { onBack?: () => void } = {}) {
  const locale = useLocale();
  const t = useTranslations("csvUpload");
  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");
  const [businessContext, setBusinessContext] = useState("");

  const [result, setResult] = useState<SegmentData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [meta, setMeta] = useState({ rowCount: 0, columnCount: 0 });
  const [redactionReport, setRedactionReport] = useState<RedactionReport | null>(null);

  const parseCsv = useCallback((file: File) => {
    setError("");
    setFileName(file.name);

    Papa.parse(file, {
      complete(parsed) {
        const allRows = parsed.data as string[][];
        const csvHeaders = allRows[0];
        const csvRows = allRows.slice(1).filter((r) => r.some((cell) => cell?.trim()));

        if (!csvHeaders?.length || csvRows.length === 0) {
          setError(t("errorParse"));
          return;
        }

        if (csvRows.length > 10000) {
          setError(t("errorTooMany"));
          return;
        }

        setHeaders(csvHeaders);
        setRows(csvRows);
        setRedactionReport(analyzeRedaction(csvHeaders, csvRows));
        setStep("preview");
      },
      error() {
        setError(t("errorParseFailed"));
      },
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      parseCsv(file);
    } else {
      setError(t("errorNotCsv"));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseCsv(file);
  }

  function loadSampleData() {
    setHeaders(SAMPLE_HEADERS);
    setRows(SAMPLE_ROWS);
    setRedactionReport(analyzeRedaction(SAMPLE_HEADERS, SAMPLE_ROWS));
    setFileName("sample-coffee-shop.csv");
    setStep("preview");
  }

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    setResult(null);
    setResultId(null);

    try {
      const anonId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ai4smb_anon_id") || "unknown"
          : "unknown";

      const rawSummary = summarizeCsv(headers, rows);
      const summary = stripPiiFromSummary(rawSummary);

      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, summary, businessContext: businessContext || undefined, locale }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorGeneric"));
        return;
      }
      setResult(data.result);
      setResultId(data.id || null);
      setMeta(data.meta);
      setStep("results");
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  function handleStartOver() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setFileName("");
    setBusinessContext("");
    setResult(null);
    setResultId(null);
    setRedactionReport(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (step === "results" && result) {
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
          meta={meta}
          onStartOver={onBack || handleStartOver}
          onReanalyze={handleAnalyze}
          loading={loading}
          headers={headers}
          rows={rows}
        />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      {/* Upload step */}
      {step === "upload" && (
        <div>
          {onBack && (
            <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {t("backToAll")}
            </button>
          )}
          <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all
              ${dragOver
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-zinc-500"
              }`}
          >
            <div className="mb-3 text-4xl">📊</div>
            <p className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {t("dropZone")}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {t("dropZoneHint")}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Sample data CTA */}
          <div className="mt-6 text-center">
            <span className="text-sm text-zinc-400 dark:text-zinc-500">{t("noData")} </span>
            <button
              onClick={loadSampleData}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {t("trySample")}
            </button>
          </div>

          {/* What data works */}
          <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("whatWorks")}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2"><span>✓</span> {t("d1")}</div>
              <div className="flex items-center gap-2"><span>✓</span> {t("d2")}</div>
              <div className="flex items-center gap-2"><span>✓</span> {t("d3")}</div>
              <div className="flex items-center gap-2"><span>✓</span> {t("d4")}</div>
              <div className="flex items-center gap-2"><span>✓</span> {t("d5")}</div>
              <div className="flex items-center gap-2"><span>✓</span> {t("d6")}</div>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 dark:bg-green-950">
            <span className="mt-0.5 text-sm">🔒</span>
            <p className="text-xs leading-relaxed text-green-800 dark:text-green-200">
              <strong>{t("privacyBold")}</strong> {t("privacyDesc")}
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Preview step */}
      {step === "preview" && (
        <div>
          <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("previewTitle")}
          </h1>
          <p className="mb-6 text-center text-zinc-500 dark:text-zinc-400">
            {fileName} — {rows.length} rows, {headers.length} columns
          </p>

          {/* Table preview */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    {headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      {row.map((cell, j) => (
                        <td key={j} className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">
                          {cell || <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                + {rows.length - 5} {t("moreRows")}
              </div>
            )}
          </div>

          {/* Business context (optional) */}
          <div className="mt-5">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("contextLabel")}
            </label>
            <input
              type="text"
              placeholder={t("contextPlaceholder")}
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleStartOver}
              className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
            >
              {t("back")}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t("analyzing")}
                </>
              ) : (
                t("analyzeBtn")
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
