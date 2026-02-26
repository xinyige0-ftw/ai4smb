export const BUSINESS_TYPES = [
  { id: "cafe", label: "Coffee / Café", icon: "☕" },
  { id: "retail", label: "Retail / Boutique", icon: "🛍️" },
  { id: "salon", label: "Salon / Beauty", icon: "✂️" },
  { id: "restaurant", label: "Restaurant / Bar", icon: "🍕" },
  { id: "home_services", label: "Home Services", icon: "🏠" },
  { id: "fitness", label: "Fitness / Wellness", icon: "🏋️" },
  { id: "consulting", label: "Consulting / Coaching", icon: "💼" },
  { id: "ecommerce", label: "Online Store", icon: "🛒" },
  { id: "trades", label: "Trades / Contractor", icon: "🔧" },
  { id: "healthcare", label: "Healthcare / Dental", icon: "🏥" },
  { id: "creative", label: "Creative / Photography", icon: "📸" },
  { id: "other", label: "Other", icon: "✏️" },
] as const;

export const GOALS = [
  { id: "new_customers", label: "Get more customers", description: "Bring in new foot traffic or online visitors", icon: "📣" },
  { id: "promotion", label: "Promote a sale or event", description: "Limited-time offer, grand opening, holiday special", icon: "🔥" },
  { id: "retention", label: "Bring back past customers", description: "Re-engage people who haven't visited in a while", icon: "🔄" },
  { id: "launch", label: "Launch something new", description: "New product, menu item, or service", icon: "🆕" },
  { id: "surprise", label: "Not sure — surprise me", description: "We'll give you our best idea for your business", icon: "🤷" },
] as const;

export const BUDGETS = [
  { id: "any", label: "Any budget" },
  { id: "once_small", label: "Just this once (<$100)" },
  { id: "monthly_mid", label: "A few hundred/mo" },
  { id: "monthly_high", label: "$500+/mo" },
  { id: "unsure", label: "Not sure" },
] as const;

export const CHANNELS = [
  { id: "smart", label: "🤖 Smart pick" },
  { id: "email", label: "Email" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "google", label: "Google Ads" },
  { id: "tiktok", label: "TikTok" },
  { id: "sms", label: "SMS" },
] as const;

export interface GenerateInput {
  businessType: string;
  businessTypeCustom?: string;
  businessName?: string;
  goal: string;
  budget: string;
  channels: string[];
  details?: string;
}

const TONE_MAP: Record<string, string> = {
  cafe: "warm, inviting, and cozy",
  retail: "trendy, exciting, and aspirational",
  salon: "luxurious, pampering, and confident",
  restaurant: "appetizing, social, and lively",
  home_services: "trustworthy, reliable, and professional",
  fitness: "energetic, motivating, and empowering",
  consulting: "authoritative, professional, and insightful",
  ecommerce: "persuasive, clear, and benefit-driven",
  trades: "dependable, straightforward, and skilled",
  healthcare: "caring, professional, and reassuring",
  creative: "artistic, inspiring, and personal",
  other: "professional and friendly",
};

export function buildPrompt(input: GenerateInput): string {
  const businessLabel =
    input.businessType === "other"
      ? input.businessTypeCustom || "small business"
      : BUSINESS_TYPES.find((b) => b.id === input.businessType)?.label || input.businessType;

  const goalLabel = GOALS.find((g) => g.id === input.goal)?.label || input.goal;
  const tone = TONE_MAP[input.businessType] || TONE_MAP.other;
  const name = input.businessName || "the business";

  const isSmartPick = input.channels.includes("smart");
  const channelInstruction = isSmartPick
    ? "Choose the 2-3 best marketing channels for this business type, budget, and goal. Explain why you chose each one and why you skipped others."
    : `The user selected these channels: ${input.channels.join(", ")}. Create content for each selected channel.`;

  let budgetInstruction = "";
  switch (input.budget) {
    case "once_small":
      budgetInstruction = "Budget is under $100 for a one-time campaign. Focus on free or very low-cost channels. Avoid suggesting Google Ads unless highly targeted with a tiny daily budget.";
      break;
    case "monthly_mid":
      budgetInstruction = "Budget is a few hundred dollars per month. Suggest a sustainable monthly content cadence. Split budget across channels.";
      break;
    case "monthly_high":
      budgetInstruction = "Budget is $500+/month. They can afford paid ads. Suggest a mix of organic and paid with a monthly calendar.";
      break;
    case "unsure":
      budgetInstruction = "The user is unsure about budget. Give a quick-win suggestion that's free or very cheap, plus a 'if you can invest more' option.";
      break;
    default:
      budgetInstruction = "No specific budget constraint. Suggest the most effective approach regardless of cost.";
  }

  return `
Business: ${name} (${businessLabel})
Goal: ${goalLabel}
${input.details ? `Additional context: ${input.details}` : ""}

${budgetInstruction}

${channelInstruction}

Tone: ${tone}

Generate a complete campaign brief with:
1. "strategy" — 2-3 sentences explaining the overall approach, why these channels, and what to expect
2. "channels" — an array of channel objects, each containing:
   - "channel": the channel name (email, instagram, facebook, google_ads, tiktok, sms)
   - "why": 1-2 sentences on why this channel works for them
   - "content": channel-specific content object

Channel content formats:
- email: { "subject": string, "body": string }
- instagram: { "caption": string, "imageIdea": string, "bestTime": string }
- facebook: { "text": string, "boostTip": string }
- google_ads: { "headlines": string[], "descriptions": string[], "keywords": string[], "dailyBudget": string }
- tiktok: { "hook": string, "script": string, "cta": string }
- sms: { "text": string (under 160 chars) }

Respond ONLY with valid JSON matching this schema:
{
  "strategy": string,
  "channels": [
    {
      "channel": string,
      "why": string,
      "content": object
    }
  ]
}
`.trim();
}

export const SYSTEM_PROMPT = `You are a senior marketing strategist who specializes in helping small businesses with limited budgets. You think about channel selection, budget allocation, timing, and audience — not just words.

When choosing channels, consider the business type, their likely audience, and budget constraints. Never suggest strategies that would waste a small budget. Be specific and actionable — give them copy they can paste and use today.

Match the tone to the business type. A bakery should sound warm and inviting. A law firm should sound authoritative. A fitness studio should sound energetic.

Always respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.`;
