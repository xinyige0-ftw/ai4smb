const DIVIDER = "═".repeat(48);
const THIN = "─".repeat(48);
const SITE = "AI4SMB Insights · ai4smbhub.com · Free";

function dateStamp(locale?: string) {
  return new Date().toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── SEGMENTS ─────────────────────────────────────────────────────

interface Segment {
  name: string;
  percentage: number;
  description: string;
  characteristics: string[];
  recommendations: string[];
}

interface SegmentData {
  summary: string;
  segments: Segment[];
  quickWins: string[];
  dataQuality: string;
}

export function formatSegmentReport(result: SegmentData, metaLabel?: string, locale?: string): string {
  const zh = locale === "zh";
  const lines: string[] = [];

  lines.push(zh ? "AI4SMB 智能营销 — 客户分群" : "AI4SMB INSIGHTS — CUSTOMER SEGMENTS");
  lines.push(`${zh ? "生成日期" : "Generated"}: ${dateStamp(locale)}`);
  if (metaLabel) lines.push(`${zh ? "来源" : "Source"}: ${metaLabel}`);
  lines.push("");

  lines.push(DIVIDER);
  lines.push(zh ? "摘要" : "SUMMARY");
  lines.push(DIVIDER);
  lines.push(result.summary);
  lines.push("");

  lines.push(DIVIDER);
  lines.push(zh ? "客户群体" : "CUSTOMER SEGMENTS");
  lines.push(DIVIDER);

  for (const seg of result.segments) {
    lines.push("");
    lines.push(`${seg.name.toUpperCase()} — ${seg.percentage}%`);
    lines.push(THIN);
    lines.push(seg.description);
    lines.push("");
    if (seg.characteristics.length) {
      lines.push(zh ? "特征:" : "Characteristics:");
      for (const t of seg.characteristics) lines.push(`  • ${t}`);
    }
    if (seg.recommendations.length) {
      lines.push("");
      lines.push(zh ? "建议:" : "Recommendations:");
      for (const r of seg.recommendations) lines.push(`  → ${r}`);
    }
  }

  if (result.quickWins?.length) {
    lines.push("");
    lines.push(DIVIDER);
    lines.push(zh ? "快速行动 — 本周可执行" : "QUICK WINS — DO THESE THIS WEEK");
    lines.push(DIVIDER);
    for (const w of result.quickWins) lines.push(`⚡ ${w}`);
  }

  if (result.dataQuality) {
    lines.push("");
    lines.push(`${zh ? "备注" : "Note"}: ${result.dataQuality}`);
  }

  lines.push("");
  lines.push(THIN);
  lines.push(SITE);

  return lines.join("\n");
}

// ─── CAMPAIGN ─────────────────────────────────────────────────────

interface CampaignChannel {
  channel: string;
  why: string;
  content: Record<string, unknown>;
}

interface CampaignData {
  strategy: string;
  channels: CampaignChannel[];
  thisWeek?: { day: string; action: string; why: string }[];
}

function formatContentBlock(channel: string, c: Record<string, unknown>): string[] {
  const lines: string[] = [];
  switch (channel) {
    case "email":
      if (c.subject) lines.push(`Subject: ${c.subject}`);
      if (c.body) { lines.push(""); lines.push(String(c.body)); }
      break;
    case "instagram":
      if (c.caption) { lines.push("Caption:"); lines.push(String(c.caption)); }
      if (c.imageIdea) { lines.push(""); lines.push(`Image idea: ${c.imageIdea}`); }
      if (c.bestTime) lines.push(`Best time to post: ${c.bestTime}`);
      break;
    case "facebook":
      if (c.text) { lines.push("Post:"); lines.push(String(c.text)); }
      if (c.boostTip) { lines.push(""); lines.push(`Boost tip: ${c.boostTip}`); }
      break;
    case "google_ads":
      if (Array.isArray(c.headlines)) {
        lines.push("Headlines:"); c.headlines.forEach((h) => lines.push(`  • ${h}`));
      }
      if (Array.isArray(c.descriptions)) {
        lines.push("Descriptions:"); c.descriptions.forEach((d) => lines.push(`  • ${d}`));
      }
      if (Array.isArray(c.keywords)) lines.push(`Keywords: ${c.keywords.join(", ")}`);
      if (c.dailyBudget) lines.push(`Suggested daily budget: ${c.dailyBudget}`);
      break;
    case "tiktok":
      if (c.hook) { lines.push(`Hook (first 3s): ${c.hook}`); lines.push(""); }
      if (c.script) { lines.push("Script:"); lines.push(String(c.script)); }
      if (c.cta) { lines.push(""); lines.push(`CTA: ${c.cta}`); }
      break;
    case "sms":
      if (c.text) { lines.push("Message:"); lines.push(String(c.text)); }
      break;
    case "xiaohongshu":
      if (c.title) { lines.push(`Title: ${c.title}`); lines.push(""); }
      if (c.body) { lines.push("Note:"); lines.push(String(c.body)); }
      if (Array.isArray(c.hashtags)) lines.push(`\nHashtags: ${c.hashtags.map((h: string) => `#${h}`).join(" ")}`);
      if (c.coverTextIdea) lines.push(`Cover text idea: ${c.coverTextIdea}`);
      if (Array.isArray(c.productTags) && c.productTags.length) lines.push(`Product tags: ${c.productTags.join(", ")}`);
      if (c.bestTime) lines.push(`Best time to post: ${c.bestTime}`);
      break;
    case "wechat":
      if (c.momentsPost) { lines.push("Moments Post:"); lines.push(String(c.momentsPost)); lines.push(""); }
      if (c.officialAccountTitle) lines.push(`Official Account Article: ${c.officialAccountTitle}`);
      if (c.officialAccountSummary) { lines.push(`Summary: ${c.officialAccountSummary}`); lines.push(""); }
      if (c.miniProgramCta) lines.push(`Mini Program CTA: ${c.miniProgramCta}`);
      if (c.bestTime) lines.push(`Best time to post: ${c.bestTime}`);
      break;
    default:
      for (const [k, v] of Object.entries(c)) lines.push(`${k}: ${String(v)}`);
  }
  return lines;
}

function hasVariants(content: Record<string, unknown>): boolean {
  return content.variant_a != null && typeof content.variant_a === "object"
    && content.variant_b != null && typeof content.variant_b === "object";
}

function formatChannel(ch: CampaignChannel): string[] {
  const lines: string[] = [];
  const label = ch.channel.replace("_", " ").toUpperCase();
  lines.push(`${label}`);
  lines.push(THIN);

  if (hasVariants(ch.content)) {
    lines.push("");
    lines.push("VARIANT A");
    lines.push(...formatContentBlock(ch.channel, ch.content.variant_a as Record<string, unknown>));
    lines.push("");
    lines.push("VARIANT B");
    lines.push(...formatContentBlock(ch.channel, ch.content.variant_b as Record<string, unknown>));
  } else {
    lines.push(...formatContentBlock(ch.channel, ch.content));
  }

  lines.push(`\nWhy this channel: ${ch.why}`);
  return lines;
}

export function formatCampaignReport(campaign: CampaignData, locale?: string): string {
  const zh = locale === "zh";
  const lines: string[] = [];

  lines.push(zh ? "AI4SMB 智能营销 — 营销方案" : "AI4SMB INSIGHTS — MARKETING CAMPAIGN");
  lines.push(`${zh ? "生成日期" : "Generated"}: ${dateStamp(locale)}`);
  lines.push("");

  lines.push(DIVIDER);
  lines.push(zh ? "策略" : "STRATEGY");
  lines.push(DIVIDER);
  lines.push(campaign.strategy);

  for (const ch of campaign.channels) {
    lines.push("");
    lines.push(DIVIDER);
    lines.push(...formatChannel(ch));
  }

  if (campaign.thisWeek?.length) {
    lines.push("");
    lines.push(DIVIDER);
    lines.push(zh ? "本周行动计划" : "THIS WEEK'S ACTION PLAN");
    lines.push(DIVIDER);
    for (const item of campaign.thisWeek) {
      lines.push(`${item.day}: ${item.action}`);
      lines.push(`  → ${item.why}`);
    }
  }

  lines.push("");
  lines.push(THIN);
  lines.push(SITE);

  return lines.join("\n");
}

// ─── UTILITIES ────────────────────────────────────────────────────

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
