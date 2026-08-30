#!/usr/bin/env node
/**
 * Plain-Node smoke test for lib/action-progress.ts — no test framework,
 * same style as scripts/test-pii.mjs / scripts/test-cohort-membership.mjs.
 * Run: node scripts/test-action-progress.mjs
 *
 * Requires a Node version that can load a .ts file directly (Node 22.6+
 * with --experimental-strip-types, unflagged/default-on on newer Node
 * 22.x/23.x+). If your Node errors on the dynamic import below, re-run
 * with: node --experimental-strip-types scripts/test-action-progress.mjs
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..");

const {
  progressStorageKey,
  stepKey,
  readProgress,
  writeProgress,
  toggleStep,
  completionCount,
} = await import(path.join(WEB_DIR, "lib", "action-progress.ts"));

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
console.log("\nTest 1: readProgress tolerant parsing — never throws, always returns a plain object");

assert(JSON.stringify(readProgress(null)) === "{}", `null => {}`);
assert(JSON.stringify(readProgress("")) === "{}", `"" => {}`);
assert(JSON.stringify(readProgress("{")) === "{}", `malformed JSON "{" => {}`);
assert(JSON.stringify(readProgress("[]")) === "{}", `JSON array "[]" => {} (not a plain object)`);
assert(JSON.stringify(readProgress('{"a":1}')) === "{}", `non-boolean value '{"a":1}' is dropped => {}`);
assert(JSON.stringify(readProgress("null")) === "{}", `JSON null literal => {}`);
assert(JSON.stringify(readProgress('"just a string"')) === "{}", `JSON string literal => {}`);

const valid = '{"0-abc123":true,"1-def456":false}';
const parsedValid = readProgress(valid);
assert(parsedValid["0-abc123"] === true && parsedValid["1-def456"] === false, `valid input round-trips booleans (got ${JSON.stringify(parsedValid)})`);

const mixed = '{"0-abc":true,"junk":"nope","1-def":42,"2-ghi":false}';
const parsedMixed = readProgress(mixed);
assert(Object.keys(parsedMixed).length === 2 && parsedMixed["0-abc"] === true && parsedMixed["2-ghi"] === false, `mixed input keeps only boolean-valued entries (got ${JSON.stringify(parsedMixed)})`);

let threw = false;
try {
  readProgress("not json at all {{{");
} catch {
  threw = true;
}
assert(!threw, `readProgress never throws on garbage input`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 2: stepKey stability and uniqueness");

const k1a = stepKey(0, "Mon", "Post a coffee photo on Instagram");
const k1b = stepKey(0, "Mon", "Post a coffee photo on Instagram");
assert(k1a === k1b, `same (index, day, action) always yields the same key (stability across "re-renders")`);

const k2 = stepKey(0, "Mon", "Post a coffee photo on Facebook");
assert(k1a !== k2, `different action text at the same index yields a different key`);

const k3 = stepKey(1, "Mon", "Post a coffee photo on Instagram");
assert(k1a !== k3, `same day/action at a different index yields a different key`);

const k4 = stepKey(0, "Tue", "Post a coffee photo on Instagram");
assert(k1a !== k4, `same action, different day, yields a different key`);

const k5a = stepKey(0, "  Mon  ", "Post a coffee photo on Instagram");
const k5b = stepKey(0, "mon", "post a coffee photo on instagram");
assert(k5a === k1a && k5b === k1a, `whitespace/casing differences normalize to the same key`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 3: toggleStep purity and round-trip");

const original = { "0-abc": true };
const originalCopy = { ...original };
const toggled = toggleStep(original, "0-abc");
assert(JSON.stringify(original) === JSON.stringify(originalCopy), `toggleStep does not mutate its input object`);
assert(toggled["0-abc"] === false, `toggling a true value flips it to false`);
assert(original !== toggled, `toggleStep returns a new object, not the same reference`);

const toggledOn = toggleStep({}, "1-new");
assert(toggledOn["1-new"] === true, `toggling an absent key sets it to true`);

const backOff = toggleStep(toggledOn, "1-new");
assert(backOff["1-new"] === false, `toggling twice returns to the original (off) state`);

const roundTripRaw = writeProgress(toggledOn);
const roundTripParsed = readProgress(roundTripRaw);
assert(JSON.stringify(roundTripParsed) === JSON.stringify(toggledOn), `writeProgress -> readProgress round-trips exactly (got ${roundTripRaw})`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 4: completionCount ignores keys not in the provided list");

const progress = { "0-a": true, "1-b": true, "2-c": false, "9-unrelated": true };
assert(completionCount(progress, ["0-a", "1-b", "2-c"]) === 2, `counts only true values among the given keys (ignores "9-unrelated")`);
assert(completionCount(progress, []) === 0, `empty key list => 0`);
assert(completionCount({}, ["0-a", "1-b"]) === 0, `empty progress map => 0`);
assert(completionCount(progress, ["0-a", "missing-key"]) === 1, `a key present in the list but absent from progress does not count`);

// ─────────────────────────────────────────────────────────────────
console.log("\nTest 5: progressStorageKey with and without a campaign id");

assert(progressStorageKey("abc-123") === "ai4smb:action-progress:abc-123", `namespaces by campaign id (got ${progressStorageKey("abc-123")})`);
assert(progressStorageKey(null) === "ai4smb:action-progress:draft", `null id falls back to the shared "draft" key`);
assert(progressStorageKey(undefined) === "ai4smb:action-progress:draft", `undefined id falls back to the shared "draft" key`);
assert(progressStorageKey("") === "ai4smb:action-progress:draft", `empty-string id falls back to the shared "draft" key`);
assert(progressStorageKey("   ") === "ai4smb:action-progress:draft", `whitespace-only id falls back to the shared "draft" key`);
assert(progressStorageKey("  abc-123  ") === "ai4smb:action-progress:abc-123", `id is trimmed before namespacing`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
