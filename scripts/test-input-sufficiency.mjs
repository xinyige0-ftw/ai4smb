#!/usr/bin/env node
/**
 * Plain-Node smoke test for lib/input-sufficiency.ts — no test framework,
 * same style as scripts/test-pii.mjs / scripts/test-csv-facts.mjs.
 * Run: node scripts/test-input-sufficiency.mjs
 *
 * Requires a Node version that can load a .ts file directly (Node 22.6+
 * with --experimental-strip-types, unflagged/default-on on newer Node
 * 22.x/23.x+). If your Node errors on the dynamic import below, re-run
 * with: node --experimental-strip-types scripts/test-input-sufficiency.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..");

const { countItems, assessInput, markLowConfidence, SUFFICIENCY_THRESHOLDS } = await import(
  path.join(WEB_DIR, "lib", "input-sufficiency.ts")
);

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ok   - ${msg}`);
  } else {
    fail++;
    console.error(`  FAIL - ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 1: countItems basic cases");
assert(countItems("") === 0, `countItems("") === 0`);
assert(countItems("   \n\n  ") === 0, `countItems(whitespace-only) === 0`);
assert(countItems("short") === 0, `countItems("short") === 0 (under 20 chars)`);

const longParagraph = "This is a single continuous block of text with no blank lines in it at all.";
assert(countItems(longParagraph) === 1, `countItems(one long paragraph) === 1`);

const threeParagraphs = [
  "This is the first paragraph and it is definitely long enough.",
  "This is the second paragraph, also comfortably over twenty characters.",
  "This is the third and final paragraph in this little test fixture.",
].join("\n\n");
assert(countItems(threeParagraphs) === 3, `countItems(three blank-line-separated paragraphs) === 3 (got ${countItems(threeParagraphs)})`);

// Multiple/irregular blank lines between blocks still separate items.
const irregularSpacing = "First item is long enough to count.\n\n\n\nSecond item is also long enough to count.";
assert(countItems(irregularSpacing) === 2, `countItems(irregular blank-line spacing) === 2 (got ${countItems(irregularSpacing)})`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 2: short blocks under 20 chars are excluded");
const mixedLengths = [
  "★★★★★", // short, excluded
  "This one is definitely long enough to be counted as a real item.",
  "ok", // short, excluded
  "Another item that clears the twenty character minimum easily.",
].join("\n\n");
assert(countItems(mixedLengths) === 2, `countItems(mixed short/long blocks) === 2 (got ${countItems(mixedLengths)})`);

const exactlyNineteen = "a".repeat(19);
const exactlyTwenty = "a".repeat(20);
assert(countItems(exactlyNineteen) === 0, `a 19-char block is excluded (boundary below MIN_BLOCK_LENGTH)`);
assert(countItems(exactlyTwenty) === 1, `a 20-char block is included (boundary at MIN_BLOCK_LENGTH)`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 3: threshold constants");
assert(SUFFICIENCY_THRESHOLDS.reviews === 8, `SUFFICIENCY_THRESHOLDS.reviews === 8`);
assert(SUFFICIENCY_THRESHOLDS.social === 5, `SUFFICIENCY_THRESHOLDS.social === 5`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 4: assessInput threshold boundary behaviour");

function makeItems(n) {
  return Array.from({ length: n }, (_, i) => `This is a sufficiently long synthetic test item number ${i}.`).join("\n\n");
}

for (const kind of ["reviews", "social"]) {
  const threshold = SUFFICIENCY_THRESHOLDS[kind];

  const belowText = makeItems(threshold - 1);
  const below = assessInput(kind, belowText);
  assert(below.itemCount === threshold - 1, `${kind}: itemCount at threshold-1 is ${threshold - 1} (got ${below.itemCount})`);
  assert(below.sufficient === false, `${kind}: threshold-1 items is NOT sufficient`);
  assert(below.threshold === threshold, `${kind}: threshold field is ${threshold}`);
  assert(below.kind === kind, `${kind}: kind field echoes input`);

  const atText = makeItems(threshold);
  const at = assessInput(kind, atText);
  assert(at.itemCount === threshold, `${kind}: itemCount at threshold is ${threshold} (got ${at.itemCount})`);
  assert(at.sufficient === true, `${kind}: exactly threshold items IS sufficient`);

  const aboveText = makeItems(threshold + 3);
  const above = assessInput(kind, aboveText);
  assert(above.sufficient === true, `${kind}: threshold+3 items IS sufficient`);
}

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 5: markLowConfidence — English");
const baseResult = {
  summary: "Two clear customer segments emerged from the data.",
  segments: [{ name: "Regulars", size: 10 }, { name: "Occasional visitors", size: 4 }],
  quickWins: ["Send a thank-you email"],
  dataQuality: "Sample size is modest.",
};
const marked = markLowConfidence(baseResult, 3, "en");
assert(marked.summary.startsWith("This analysis is based on 3 items"), `EN: summary is prepended with the caveat sentence (got: ${marked.summary.slice(0, 60)}...)`);
assert(marked.summary.includes("Two clear customer segments emerged from the data."), `EN: original summary text is preserved after the caveat`);
const occurrences = marked.summary.split("This analysis is based on 3 items").length - 1;
assert(occurrences === 1, `EN: caveat sentence appears exactly once in summary (got ${occurrences})`);
assert(typeof marked.dataQuality === "string" && marked.dataQuality.includes("small sample"), `EN: dataQuality is set to the caveat`);
assert(JSON.stringify(marked.segments) === JSON.stringify(baseResult.segments), `EN: segments array left untouched`);
assert(JSON.stringify(marked.quickWins) === JSON.stringify(baseResult.quickWins), `EN: quickWins array left untouched`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 6: markLowConfidence — Chinese");
const markedZh = markLowConfidence(baseResult, 3, "zh");
assert(markedZh.summary.includes("本次分析基于 3 条内容"), `ZH: summary contains the Chinese caveat (got: ${markedZh.summary.slice(0, 40)}...)`);
assert(markedZh.summary.includes("简体中文") === false, `ZH: sentence is plain Chinese text, not a meta-instruction`);
assert(markedZh.dataQuality.includes("样本量较小"), `ZH: dataQuality is set to the Chinese caveat`);
assert(JSON.stringify(markedZh.segments) === JSON.stringify(baseResult.segments), `ZH: segments array left untouched`);

// No locale / non-"zh" locale falls back to English.
const markedDefault = markLowConfidence(baseResult, 5, undefined);
assert(markedDefault.summary.includes("This analysis is based on 5 items"), `default locale (undefined) falls back to English`);

// Original object is not mutated.
assert(baseResult.summary === "Two clear customer segments emerged from the data.", `markLowConfidence does not mutate its input`);

// Works with a missing/empty summary too.
const noSummary = markLowConfidence({ segments: [] }, 2, "en");
assert(noSummary.summary.startsWith("This analysis is based on 2 items"), `markLowConfidence handles a result with no prior summary`);

// --- newline-separated items (regression: previously counted as 1) ---
{
  const fourByNewline = [
    "Best coffee in the neighborhood, the baristas remember my order.",
    "Quick stop on my commute, usually a latte and a croissant.",
    "Lovely quiet corner for laptop work in the afternoon here.",
    "The cold brew is consistently excellent and never too bitter.",
  ].join("\n");
  assert(countItems(fourByNewline) === 4, `four newline-separated reviews count as 4 (got ${countItems(fourByNewline)})`);

  const twoByBlankLine = "The coffee here is great and the space is quiet.\n\nGreat espresso and the staff remembered my order.";
  assert(countItems(twoByBlankLine) === 2, `two blank-line-separated reviews count as 2 (got ${countItems(twoByBlankLine)})`);

  const oneContinuous = "One single continuous review with no line breaks whatsoever in it.";
  assert(countItems(oneContinuous) === 1, `one continuous block counts as 1 (got ${countItems(oneContinuous)})`);

  const singular = markLowConfidence({ summary: "x" }, 1).summary;
  assert(/based on 1 item,/.test(singular), `singular reads "1 item" not "1 items" (got: ${singular.slice(0, 40)})`);
  const plural = markLowConfidence({ summary: "x" }, 3).summary;
  assert(/based on 3 items,/.test(plural), `plural reads "3 items" (got: ${plural.slice(0, 40)})`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
