#!/usr/bin/env node
/**
 * Plain-Node smoke test for computeCohortMembership() and toCsv() in
 * lib/segment-prompts.ts — no test framework, same style as
 * scripts/test-csv-facts.mjs / scripts/test-pii.mjs.
 * Run: node scripts/test-cohort-membership.mjs
 *
 * Requires a Node version that can load a .ts file directly (Node 22.6+
 * with --experimental-strip-types, unflagged/default-on on newer Node
 * 22.x/23.x+). If your Node errors on the dynamic import below, re-run
 * with: node --experimental-strip-types scripts/test-cohort-membership.mjs
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..");
const CSV_PATH = path.join(__dirname, "fixtures", "sample-customers-cafe.csv");

const { computeCsvFacts, computeCohortMembership, toCsv } = await import(
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

const now = new Date("2026-08-29T12:00:00Z");
const parsed = Papa.parse(fs.readFileSync(CSV_PATH, "utf8").trim(), { skipEmptyLines: true }).data;
const headers = parsed[0];
const rows = parsed.slice(1);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 1: membership sizes match computeCsvFacts cohort sizes on the fixture");
const facts = computeCsvFacts(headers, rows, now);
const membership = computeCohortMembership(headers, rows, now);

assert(facts.cohorts.map((c) => c.size).join(",") === "20,6,62", `sanity: fixture cohort sizes are 20/6/62 (got ${facts.cohorts.map((c) => c.size).join(",")})`);
assert(membership.length === facts.cohorts.length, `membership has one entry per non-empty fact cohort (got ${membership.length}, expected ${facts.cohorts.length})`);

for (const cohort of facts.cohorts) {
  const m = membership.find((x) => x.cohortId === cohort.id);
  assert(!!m, `membership contains cohort "${cohort.id}"`);
  assert(m.rowIndices.length === cohort.size, `membership["${cohort.id}"].rowIndices.length (${m?.rowIndices.length}) === facts cohort size (${cohort.size})`);
}

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 2: the three index sets are disjoint and their union is every row");
const allIndices = membership.flatMap((m) => m.rowIndices);
const uniqueIndices = new Set(allIndices);
assert(allIndices.length === uniqueIndices.size, `no row index appears in more than one cohort (${allIndices.length} indices, ${uniqueIndices.size} unique)`);
assert(allIndices.length === rows.length, `union of all cohort row indices covers every row (${allIndices.length} of ${rows.length})`);
for (let i = 0; i < rows.length; i++) {
  assert(uniqueIndices.has(i), `row index ${i} is present in exactly one cohort`);
}

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 3: empty cohorts (computeCsvFacts produced none) yield an empty membership array");
const noCohorts = computeCohortMembership(["phone"], [["2065550142"]], now);
assert(Array.isArray(noCohorts) && noCohorts.length === 0, `no eligible columns => empty membership array`);

const tooFewOrderRows = computeCohortMembership(["aov"], [["100"], ["200"]], now);
assert(tooFewOrderRows.length === 0, `too few rows for an IQR fence and no recency column => empty membership array`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 4: membership precedence matches computeCsvFacts (lapsed first, then high value, then remainder)");
const overlapRows = Array.from({ length: 10 }, (_, i) => [i === 9 ? "2025-01-01" : "2026-08-20", i === 9 ? "$1,000.00" : String(i + 1)]);
const overlapHeaders = ["last_visit", "aov"];
const overlapFacts = computeCsvFacts(overlapHeaders, overlapRows, now);
const overlapMembership = computeCohortMembership(overlapHeaders, overlapRows, now);
assert(overlapFacts.cohorts.map((c) => [c.id, c.size]).toString() === "lapsed,1,other_rows,9", `sanity: row 9 is lapsed AND high value, but lapsed wins (got ${overlapFacts.cohorts.map((c) => [c.id, c.size])})`);
assert(overlapMembership.find((m) => m.cohortId === "lapsed")?.rowIndices.join(",") === "9", `membership: row 9 goes to "lapsed", not "high_order_value"`);
assert(!overlapMembership.some((m) => m.cohortId === "high_order_value"), `membership has no "high_order_value" entry when the only qualifying row is already lapsed`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 5: toCsv quoting — commas, quotes and newlines (RFC4180)");
assert(toCsv(["a", "b"], [["1", "2"]]) === "a,b\r\n1,2", `plain values need no quoting`);
assert(toCsv(["a"], [["has,comma"]]) === 'a\r\n"has,comma"', `a comma in a value triggers quoting`);
assert(toCsv(["a"], [['has"quote']]) === 'a\r\n"has""quote"', `a double quote is doubled and the field is quoted`);
assert(toCsv(["a"], [["has\nnewline"]]) === 'a\r\n"has\nnewline"', `a newline in a value triggers quoting`);
assert(toCsv(["a"], [["plain"]]) === "a\r\nplain", `an ordinary value passes through unquoted`);
const roundTrip = toCsv(["name", "note"], [["Jane, R.", 'Said "hi" then\nleft']]);
const reParsed = Papa.parse(roundTrip, { skipEmptyLines: true }).data;
assert(reParsed[0][0] === "name" && reParsed[0][1] === "note", `round-trip: header row parses back correctly`);
assert(reParsed[1][0] === "Jane, R." && reParsed[1][1] === 'Said "hi" then\nleft', `round-trip: comma/quote/newline value parses back to the original string`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 6: toCsv formula-injection prefixing");
for (const dangerous of ["=SUM(A1:A2)", "+1+1", "-2+3", "@cmd"]) {
  const csv = toCsv(["cell"], [[dangerous]]);
  const expected = /[",\r\n]/.test(`'${dangerous}`) ? `cell\r\n"'${dangerous}"` : `cell\r\n'${dangerous}`;
  assert(csv === expected, `toCsv() prefixes a leading ${JSON.stringify(dangerous[0])} with a single quote (got ${JSON.stringify(csv)})`);
}
assert(toCsv(["cell"], [["=SUM(A1,A2)"]]) === 'cell\r\n"\'=SUM(A1,A2)"', `a formula value that also contains a comma is both prefixed and quoted`);
assert(toCsv(["cell"], [["not a formula"]]) === "cell\r\nnot a formula", `a value that merely contains "=" mid-string is left unprefixed`);
assert(toCsv(["cell"], [["100"]]) === "cell\r\n100", `an ordinary numeric value is left unprefixed`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
