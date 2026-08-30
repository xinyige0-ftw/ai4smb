import assert from 'node:assert/strict';
import fs from 'node:fs';
import Papa from 'papaparse';
import {groundCsvResult,computeCsvFacts,summarizeCsv,stripPiiFromSummary,buildSegmentPrompt,stripUnfoundedSizes} from '../lib/segment-prompts.ts';
const now=new Date('2026-08-29T12:00:00Z');
const parsed=Papa.parse(fs.readFileSync(new URL('./fixtures/sample-customers-cafe.csv',import.meta.url),'utf8').trim(),{skipEmptyLines:true}).data;
const facts=computeCsvFacts(parsed[0],parsed.slice(1),now);
assert.equal(facts.recency.lapsedRows,20);
assert.equal(facts.orderValue.highValueRows,6);
assert.deepEqual(facts.cohorts.map(c=>c.size),[20,6,62]);
assert.equal(facts.cohorts.reduce((n,c)=>n+c.size,0),88);
assert.equal(facts.recency.validRows,88);
assert.ok(Math.abs(facts.orderValue.median-7.36)<1e-8);
assert.ok(Math.abs(facts.orderValue.upperFence-11.4775)<1e-8);
assert.ok(!JSON.stringify(facts).includes('@'));
const boundary=computeCsvFacts(['last_visit'],[['2026-05-01'],['2026-05-02'],['2026-08-30'],['2026-02-30'],[''],['not-a-date']],now);
assert.equal(boundary.recency.lapsedRows,1);
assert.equal(boundary.recency.validRows,2);
assert.equal(boundary.recency.missingOrInvalidRows,4);
assert.deepEqual(boundary.cohorts.map(c=>c.size),[1,5]);
assert.equal(computeCsvFacts(['phone'],[['2065550142']],now).cohorts.length,0);
assert.equal(computeCsvFacts(['last_visit','last_order_date'],[['2025-01-01','2026-08-20']],now).recency,undefined);
assert.equal(computeCsvFacts(['last_visit'],[['invalid']],now).recency,undefined);
assert.equal(computeCsvFacts([],[],now).cohorts.length,0);
assert.equal(computeCsvFacts(['aov'],[['100'],['200']],now).orderValue,undefined);
assert.equal(computeCsvFacts(['aov'],Array.from({length:10},()=>['10']),now).orderValue,undefined);
const overlap=computeCsvFacts(['last_visit','aov'],Array.from({length:10},(_,i)=>[i===9?'2025-01-01':'2026-08-20',i===9?'$1,000.00':String(i+1)]),now);
assert.equal(overlap.orderValue.highValueRows,1);
assert.deepEqual(overlap.cohorts.map(c=>[c.id,c.size]),[['lapsed',1],['other_rows',9]]);
const invalidAmount=computeCsvFacts(['aov'],[[''],['Infinity'],['-4'],['1,2'],['USD 100'],...Array.from({length:8},(_,i)=>[String(i+1)])],now);
assert.equal(invalidAmount.orderValue.validRows,8);
assert.equal(invalidAmount.orderValue.missingOrInvalidRows,5);
const summary=stripPiiFromSummary(summarizeCsv(parsed[0],parsed.slice(1)));
assert.ok(summary.computedFacts);
assert.equal(summary.columns.some(c=>c.name==='phone'),false);
assert.ok(buildSegmentPrompt(summary).includes('authoritative counts'));
assert.ok(buildSegmentPrompt(summary,undefined,'zh').includes('简体中文'));
const guarded=groundCsvResult({segments:[{cohortId:"lapsed",size:999,percentage:99,name:"invented",recommendations:["Test a small win-back campaign"]}],summary:"invented",quickWins:[]},facts);
assert.deepEqual(guarded.segments.map(s=>s.size),[20,6,62]);
assert.deepEqual(guarded.segments.map(s=>s.percentage),[22.7,6.8,70.5]);
assert.ok(!guarded.summary.includes("invented"));
assert.ok(!JSON.stringify(guarded).includes("999"));

// Change 3: every cohort's recommendations lead with a deterministic,
// count-bearing line, followed by whatever the model supplied (or the
// existing fallback line when the model supplied nothing for that cohort).
assert.equal(guarded.segments[0].recommendations[0],"Start with these 20 rows (22.7% of the file).");
assert.equal(guarded.segments[0].recommendations[1],"Test a small win-back campaign");
assert.equal(guarded.segments[0].recommendations.length,2);
assert.equal(guarded.segments[1].recommendations[0],"Start with these 6 rows (6.8% of the file).");
assert.equal(guarded.segments[1].recommendations.length,2, "cohort with no model recommendations still gets the lead line plus the existing fallback");
assert.equal(guarded.segments[2].recommendations[0],"Start with these 62 rows (70.5% of the file).");

// Applying groundCsvResult a second time (e.g. accidental double-wrap) must
// not duplicate the lead line.
const reGuarded=groundCsvResult(guarded,facts);
assert.equal(reGuarded.segments[0].recommendations[0],"Start with these 20 rows (22.7% of the file).");
assert.equal(reGuarded.segments[0].recommendations.filter(r=>r==="Start with these 20 rows (22.7% of the file).").length,1);
assert.deepEqual(reGuarded.segments[0].recommendations,guarded.segments[0].recommendations);

const guardedZh=groundCsvResult({segments:[{cohortId:"lapsed",recommendations:["先做一次小规模挽回测试"]}],summary:"",quickWins:[]},facts,"zh");
assert.equal(guardedZh.segments[0].recommendations[0],"先从这 20 行开始（占文件的 22.7%）。");
assert.equal(guardedZh.segments[0].recommendations[1],"先做一次小规模挽回测试");

assert.ok(groundCsvResult({},facts,"zh").summary.includes("88 行"));
const legacy={summary:"legacy",segments:[]};
assert.equal(groundCsvResult(legacy),legacy);

// ─────────────────────────────────────────────────────────────────
// Change 2: stripUnfoundedSizes() removes invented `size` fields for modes
// with no uploaded dataset, keeping percentages and every other field intact.
console.log('\nstripUnfoundedSizes assertions');
const rawResult = {
  summary: "Two segments emerged.",
  segments: [
    { name: "Regulars", percentage: 60, size: 240, color: "blue", recommendations: ["Do X"] },
    { name: "Occasional", percentage: 40, size: 160, color: "green", recommendations: ["Do Y"] },
  ],
  quickWins: ["Send a promo"],
};
const stripped = stripUnfoundedSizes(rawResult, "en");
assert.ok(stripped.segments.every(s=>!("size" in s)), "size field removed from every segment");
assert.deepEqual(stripped.segments.map(s=>s.percentage),[60,40], "percentages retained");
assert.deepEqual(stripped.segments.map(s=>s.name),["Regulars","Occasional"], "other fields (name) untouched");
assert.deepEqual(stripped.segments.map(s=>s.recommendations),[["Do X"],["Do Y"]], "other fields (recommendations) untouched");
assert.equal(stripped.summary,"Two segments emerged.", "summary untouched");
assert.deepEqual(stripped.quickWins,["Send a promo"], "quickWins untouched");
assert.equal(stripped.dataQuality,"No customer file was analysed for this result, so group sizes are not counted. Percentages are the model's estimates.");

const withExistingDataQuality = stripUnfoundedSizes({...rawResult, dataQuality: "Sample skews toward loyalty members."}, "en");
assert.ok(withExistingDataQuality.dataQuality.startsWith("Sample skews toward loyalty members."), "existing dataQuality text preserved");
assert.ok(withExistingDataQuality.dataQuality.includes("No customer file was analysed"), "qualifier appended to existing dataQuality");

const doubleApplied = stripUnfoundedSizes(withExistingDataQuality, "en");
const noteOccurrences = doubleApplied.dataQuality.split("No customer file was analysed for this result").length - 1;
assert.equal(noteOccurrences,1, "dataQuality note is not duplicated on a second application");

const strippedZh = stripUnfoundedSizes(rawResult, "zh");
assert.equal(strippedZh.dataQuality,"本次结果没有分析任何客户数据文件，因此各组人数无法计数，百分比是模型的估计值。", "Chinese qualifier is correct");
assert.ok(strippedZh.segments.every(s=>!("size" in s)), "ZH: size field removed from every segment");

console.log('CSV facts and result guard assertions passed; known fixture cohorts = 20 / 6 / 62.');
