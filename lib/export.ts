const DIVIDER = "═".repeat(48);
const THIN = "─".repeat(48);
const SITE = "AI4SMB Insights · ai4smb-web.vercel.app · Free";

function dateStamp() {
  return new Date().toLocaleDateString("en-US", {
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

export function formatSegmentReport(result: SegmentData, metaLabel?: string): string {
  const lines: string[] = [];

  lines.push("AI4SMB INSIGHTS — CUSTOMER SEGMENTS");
  lines.push(`Generated: ${dateStamp()}`);
  if (metaLabel) lines.push(`Source: ${metaLabel}`);
  lines.push("");

  lines.push(DIVIDER);
  lines.push("SUMMARY");
  lines.push(DIVIDER);
  lines.push(result.summary);
  lines.push("");

  lines.push(DIVIDER);
  lines.push("CUSTOMER SEGMENTS");
  lines.push(DIVIDER);

  for (const seg of result.segments) {
    lines.push("");
    lines.push(`${seg.name.toUpperCase()} — ${seg.percentage}%`);
    lines.push(THIN);
    lines.push(seg.description);
    lines.push("");
    if (seg.characteristics.length) {
      lines.push("Characteristics:");
      for (const t of seg.characteristics) lines.push(`  • ${t}`);
    }
    if (seg.recommendations.length) {
      lines.push("");
      lines.push("Recommendations:");
      for (const r of seg.recommendations) lines.push(`  → ${r}`);
    }
  }

  if (result.quickWins?.length) {
    lines.push("");
    lines.push(DIVIDER);
    lines.push("QUICK WINS — DO THESE THIS WEEK");
    lines.push(DIVIDER);
    for (const w of result.quickWins) lines.push(`⚡ ${w}`);
  }

  if (result.dataQuality) {
    lines.push("");
    lines.push(`Note: ${result.dataQuality}`);
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
}

function formatChannel(ch: CampaignChannel): string[] {
  const lines: string[] = [];
  const label = ch.channel.replace("_", " ").toUpperCase();
  lines.push(`${label}`);
  lines.push(THIN);

  const c = ch.content;

  switch (ch.channel) {
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
    default:
      for (const [k, v] of Object.entries(c)) lines.push(`${k}: ${String(v)}`);
  }

  lines.push(`\nWhy this channel: ${ch.why}`);
  return lines;
}

export function formatCampaignReport(campaign: CampaignData): string {
  const lines: string[] = [];

  lines.push("AI4SMB INSIGHTS — MARKETING CAMPAIGN");
  lines.push(`Generated: ${dateStamp()}`);
  lines.push("");

  lines.push(DIVIDER);
  lines.push("STRATEGY");
  lines.push(DIVIDER);
  lines.push(campaign.strategy);

  for (const ch of campaign.channels) {
    lines.push("");
    lines.push(DIVIDER);
    lines.push(...formatChannel(ch));
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
