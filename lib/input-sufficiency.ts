/**
 * Input-sufficiency checks for the free-form "paste your reviews" /
 * "paste your social content" analysis flows (ReviewAnalysis.tsx,
 * SocialAnalysis.tsx). These flows accept any non-empty text and hand it to
 * a model that returns confidently-worded customer segments even from a
 * couple of pasted reviews. We never block submission — a hard floor would
 * be a worse product than a small-sample result — but we do count how many
 * distinct items were actually pasted, and use that count to (a) warn the
 * user before they read the result, and (b) label the result itself so it
 * can't be mistaken for a reliable segmentation.
 *
 * Pure, framework-free so it can be unit tested with a plain Node script
 * (scripts/test-input-sufficiency.mjs) — see lib/segment-prompts.ts for the
 * same pattern.
 */

export type InputKind = "reviews" | "social";

export interface SufficiencyResult {
  kind: InputKind;
  itemCount: number;
  threshold: number;
  sufficient: boolean;
}

/** Minimum item count below which the result is labeled low-confidence. */
export const SUFFICIENCY_THRESHOLDS: Record<InputKind, number> = {
  reviews: 8,
  social: 5,
};

/** Blocks shorter than this (after trimming) are noise, not a real item —
 * a stray star rating, a lone newline, a leftover "Comments:" label. */
const MIN_BLOCK_LENGTH = 20;

/**
 * Splits pasted free-form text into discrete items, trims each block, and
 * discards blocks under MIN_BLOCK_LENGTH characters.
 *
 * People separate pasted reviews two ways: with a blank line between them,
 * and with a single newline between them. Splitting only on blank lines
 * counts four newline-separated reviews as one item, which both understates
 * the sample and prints a visibly wrong number to the user. So we split both
 * ways and take whichever yields more items. A single continuous block with
 * no line breaks still counts as exactly 1.
 *
 * This can overcount one long review that contains its own paragraph breaks.
 * That direction is the safer error: the count only drives a caution notice,
 * and overstating the sample merely suppresses a warning the user did not
 * need, whereas understating it prints a number they can see is wrong.
 */
function splitBlocks(text: string, separator: RegExp): number {
  return text
    .split(separator)
    .map((block) => block.trim())
    .filter((block) => block.length >= MIN_BLOCK_LENGTH).length;
}

export function countItems(text: string): number {
  if (!text || !text.trim()) return 0;
  const byBlankLine = splitBlocks(text, /\n\s*\n+/);
  const byNewline = splitBlocks(text, /\n+/);
  return Math.max(byBlankLine, byNewline);
}

/** Counts items in `text` and compares against the threshold for `kind`. */
export function assessInput(kind: InputKind, text: string): SufficiencyResult {
  const itemCount = countItems(text);
  const threshold = SUFFICIENCY_THRESHOLDS[kind];
  return { kind, itemCount, threshold, sufficient: itemCount >= threshold };
}

const LOW_CONFIDENCE_SENTENCE = {
  en: (n: number) =>
    `This analysis is based on ${n} ${n === 1 ? "item" : "items"}, which is a small sample. Treat the groups below as preliminary observations rather than an established segmentation.`,
  zh: (n: number) =>
    `本次分析基于 ${n} 条内容，样本量较小。下面的分组应视为初步观察，而非已确立的客群划分。`,
} as const;

/**
 * Deterministically marks a model-generated segmentation result as low
 * confidence when the input sample was too small. Runs strictly after
 * generation — never touches the prompt — so the caveat can't be diluted or
 * "talked out of" by the model. Prepends one sentence to `summary` and sets
 * `dataQuality` to that same caveat; every other field of `result` passes
 * through unchanged.
 */
export function markLowConfidence(
  result: Record<string, unknown>,
  itemCount: number,
  locale?: string
): Record<string, unknown> {
  const sentence = locale === "zh" ? LOW_CONFIDENCE_SENTENCE.zh(itemCount) : LOW_CONFIDENCE_SENTENCE.en(itemCount);
  const existingSummary = typeof result.summary === "string" ? result.summary : "";
  const summary = existingSummary ? `${sentence} ${existingSummary}` : sentence;
  return { ...result, summary, dataQuality: sentence };
}
