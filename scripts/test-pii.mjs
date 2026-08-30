#!/usr/bin/env node
/**
 * Plain-Node smoke test for the PII-stripping pipeline in lib/segment-prompts.ts.
 * No test framework — just run: node scripts/test-pii.mjs
 *
 * Verifies the fix for the data-corruption bug where the phone-number regex
 * matched ISO dates (e.g. "2025-09-12") in first_visit/last_visit columns,
 * silently replacing real dates with "[phone]" before the data ever reached
 * the model.
 *
 * Requires a Node version that can load a .ts file directly (Node 22.6+ with
 * --experimental-strip-types, which is unflagged/default-on on newer Node
 * 22.x / 23.x+ releases). If your Node errors on the dynamic import below,
 * re-run with: node --experimental-strip-types scripts/test-pii.mjs
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..");
const CSV_PATH = path.join(__dirname, "fixtures", "sample-customers-cafe.csv");

const { stripPii, summarizeCsv, stripPiiFromSummary, analyzeRedaction, buildSegmentPrompt } = await import(
  path.join(WEB_DIR, "lib", "segment-prompts.ts")
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
// Test 1: the tightened phone regex still matches real phone formats
// ─────────────────────────────────────────────────────────────────
console.log("\nTest 1: real phone-number formats are still masked");
const REAL_PHONES = ["(206) 555-0962", "206-555-0142", "+1 206 555 0142", "2065550142"];
for (const phone of REAL_PHONES) {
  const result = stripPii(phone);
  assert(result === "[phone]", `stripPii(${JSON.stringify(phone)}) === "[phone]" (got ${JSON.stringify(result)})`);
}

// ─────────────────────────────────────────────────────────────────
// Test 2: the tightened phone regex does NOT match dates / zips / decimals
// ─────────────────────────────────────────────────────────────────
console.log("\nTest 2: non-phone strings are left untouched");
const NON_PHONES = ["2025-09-12", "98102", "213.72", "2026"];
for (const value of NON_PHONES) {
  const result = stripPii(value);
  assert(result === value, `stripPii(${JSON.stringify(value)}) unchanged (got ${JSON.stringify(result)})`);
}

// Demonstrate the original bug for context: the OLD regex (as it shipped)
// really did match these non-phone strings. This isn't testing our code —
// it documents why the fix in Test 2 above matters.
console.log("\nTest 2b: for reference, the OLD regex incorrectly matched these");
const OLD_BROKEN_PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;
for (const value of NON_PHONES) {
  const oldMatched = OLD_BROKEN_PHONE_RE.test(value);
  console.log(`  ${oldMatched ? "old regex WOULD corrupt" : "old regex left alone"} - ${JSON.stringify(value)}`);
}

// ─────────────────────────────────────────────────────────────────
// Test 3: full pipeline over the real 88-row sample CSV
// ─────────────────────────────────────────────────────────────────
console.log(`\nTest 3: full pipeline over ${path.relative(WEB_DIR, CSV_PATH)}`);

if (!fs.existsSync(CSV_PATH)) {
  console.error(`  FAIL - CSV not found at ${CSV_PATH}`);
  fail++;
} else {
  const csvText = fs.readFileSync(CSV_PATH, "utf8");
  const parsed = Papa.parse(csvText.trim(), { skipEmptyLines: true });
  const headers = parsed.data[0];
  const rows = parsed.data.slice(1);

  assert(rows.length === 88, `sample CSV has 88 data rows (got ${rows.length})`);

  // 3a. analyzeRedaction() counts — should be close to the real number of
  // emails/phones actually present in the file (88 in their dedicated
  // columns + a handful embedded in the "notes" column), NOT inflated by
  // first_visit/last_visit dates being misread as phone numbers (which
  // would have added 176 — one per date column per row — to phonesMasked).
  const report = analyzeRedaction(headers, rows);
  console.log(`  report: emailsMasked=${report.emailsMasked}, phonesMasked=${report.phonesMasked}`);

  assert(
    report.emailsMasked >= 90 && report.emailsMasked <= 110,
    `emailsMasked is roughly ~96-101 (got ${report.emailsMasked}) — real emails only, no date/regex corruption to inflate it`
  );
  assert(
    report.phonesMasked >= 90 && report.phonesMasked <= 105,
    `phonesMasked is roughly ~96 (got ${report.phonesMasked}), not the old broken ~264-272 (88 real + 176 dates)`
  );
  assert(
    report.phonesMasked < 150,
    `phonesMasked (${report.phonesMasked}) is nowhere near the old buggy total of ~264+ — date columns are no longer scanned`
  );

  // 3b. Column typing: first_visit/last_visit must be classified as "date",
  // and numeric columns as "numeric" — this is what the structural guard
  // relies on to skip masking them.
  const summary = summarizeCsv(headers, rows);
  const colType = (name) => summary.columns.find((c) => c.name === name)?.type;
  assert(colType("first_visit") === "date", `first_visit column classified as "date" (got ${colType("first_visit")})`);
  assert(colType("last_visit") === "date", `last_visit column classified as "date" (got ${colType("last_visit")})`);
  assert(colType("zip") === "numeric", `zip column classified as "numeric" (got ${colType("zip")})`);
  assert(colType("total_spend") === "numeric", `total_spend column classified as "numeric" (got ${colType("total_spend")})`);

  // 3c. The actual values that reach the model: sampleRows after
  // stripPiiFromSummary() must still contain real ISO dates in
  // first_visit/last_visit, never "[phone]".
  const stripped = stripPiiFromSummary(summary);
  const isoDate = /^\d{4}-\d{1,2}-\d{1,2}$/;
  const datesIntact = stripped.sampleRows.every(
    (row) => isoDate.test(row.first_visit) && isoDate.test(row.last_visit)
  );
  assert(datesIntact, `every sampled first_visit/last_visit value is still a real ISO date (n=${stripped.sampleRows.length})`);

  const anyPhoneTagInDates = stripped.sampleRows.some(
    (row) => row.first_visit === "[phone]" || row.last_visit === "[phone]"
  );
  assert(!anyPhoneTagInDates, `no first_visit/last_visit value was replaced with "[phone]"`);

  // 3d. Same check on summarizeCsv()'s own sampleRows, before
  // stripPiiFromSummary() runs its second pass — the bug also lived here.
  const rawSummaryDatesIntact = summary.sampleRows.every(
    (row) => isoDate.test(row.first_visit) && isoDate.test(row.last_visit)
  );
  assert(rawSummaryDatesIntact, `summarizeCsv()'s own sampleRows also leave dates intact (n=${summary.sampleRows.length})`);
}

// Regression: numeric contact columns must not bypass privacy filtering.
console.log("\nTest 4: identifying columns override numeric/date type guards");
for (const label of ["phone", "Phone Number", "customer_phone", "email", "customer_name"]) {
  const headers = [label, "last_visit", "total_spend", "zip"];
  const rows = [["2065550142", "2026-08-01", "100", "98102"], ["2065550153", "2026-08-02", "200", "98103"]];
  const sanitized = stripPiiFromSummary(summarizeCsv(headers, rows));
  assert(!sanitized.columns.some(c => c.name === label), `${label}: identifying column and its numeric statistics removed`);
  assert(sanitized.sampleRows.every(row => !(label in row)), `${label}: identifying sample cells removed`);
  assert(!JSON.stringify(sanitized).includes("206555"), `${label}: serialized upload contains no phone values or derived statistics`);
  assert(!buildSegmentPrompt(sanitized).includes("206555"), `${label}: model prompt contains no phone values or derived statistics`);
  assert(sanitized.sampleRows[0].last_visit === "2026-08-01" && sanitized.sampleRows[0].total_spend === "100" && sanitized.sampleRows[0].zip === "98102", `${label}: date, amount and ZIP preserved`);
  assert(JSON.stringify(stripPiiFromSummary(sanitized)) === JSON.stringify(sanitized), `${label}: repeated sanitation is stable`);
}
const numericContactReport = analyzeRedaction(["phone", "last_visit"], [["2065550142", "2026-08-01"], ["2065550153", "2026-08-02"]]);
assert(numericContactReport.phonesMasked === 2, "redaction notice counts numeric phone numbers, not dates");
const allPrivate = stripPiiFromSummary(summarizeCsv(["name", "phone"], [["Synthetic Person", "2065550142"]]));
assert(allPrivate.columns.length === 0 && JSON.stringify(allPrivate.sampleRows) === "[{}]", "an identifiers-only upload has no analyzable columns, allowing API validation to reject it");

// ─────────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
