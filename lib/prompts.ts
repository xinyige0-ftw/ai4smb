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
  { id: "xiaohongshu", label: "小红书 RedNote" },
  { id: "wechat", label: "微信 WeChat" },
] as const;

export interface GenerateInput {
  businessType: string;
  businessTypeCustom?: string;
  businessName?: string;
  location?: string;
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

export function buildPrompt(input: GenerateInput, locale?: string): string {
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
${input.location ? `Location: ${input.location}` : ""}
${input.details ? `Products/services: ${input.details}` : ""}
Goal: ${goalLabel}

${budgetInstruction}

${channelInstruction}

Tone: ${tone}

Generate a complete campaign brief with:
1. "strategy" — 2-3 sentences explaining the overall approach, why these channels, and what to expect
2. "channels" — an array of channel objects, each containing:
   - "channel": the channel name (email, instagram, facebook, google_ads, tiktok, sms, xiaohongshu, wechat)
   - "why": 1-2 sentences on why this channel works for them
   - "content": channel-specific content object
3. For each channel, generate TWO content variants (A and B) with different angles or tones:
   - variant_a: the primary recommendation
   - variant_b: an alternative approach (different angle, tone, or hook)
   Wrap channel-specific fields inside "variant_a" and "variant_b" objects.
4. "thisWeek" — an array of 3 specific, time-bound actions the business owner should take THIS WEEK:
   [
     { "day": "Monday", "action": "specific action", "why": "brief reason" },
     { "day": "Wednesday", "action": "specific action", "why": "brief reason" },
     { "day": "Friday", "action": "specific action", "why": "brief reason" }
   ]

Channel content formats (these fields go INSIDE variant_a and variant_b):
- email: { "subject": string, "body": string }
- instagram: { "caption": string, "imageIdea": string, "bestTime": string }
- facebook: { "text": string, "boostTip": string, "imageIdea": string }
- google_ads: { "headlines": string[], "descriptions": string[], "keywords": string[], "dailyBudget": string }
- tiktok: { "hook": string, "script": string, "cta": string, "thumbnailIdea": string }
- sms: { "text": string (under 160 chars) }
- xiaohongshu: { "title": string (note title, ~20 chars, emoji-heavy), "body": string (300-800 chars with line breaks), "hashtags": string[], "coverTextIdea": string, "productTags": string[], "bestTime": string }
- wechat: { "momentsPost": string (concise, personal tone), "officialAccountTitle": string, "officialAccountSummary": string (~100 chars), "miniProgramCta": string, "bestTime": string }

IMAGE IDEA RULES — "imageIdea", "coverTextIdea", and "thumbnailIdea" are used to generate AI images. They MUST be written as visual scene descriptions, NOT marketing briefs. Follow this format:
- Describe the SCENE: subject, setting, lighting, camera angle, colors, mood
- Be specific and concrete — describe what the viewer would literally see in the photo
- Include the business type and product/service visually
- WRONG: "Promote the open house event with a professional flyer" or "A marketing image for a real estate agent"
- WRONG: "An image showcasing our services" or "Professional photo for social media"
- CORRECT: "Bright modern kitchen with marble countertops and sunlight streaming through large windows, staged with fresh flowers and coffee cups, shot from doorway angle, warm inviting tones"
- CORRECT: "Overhead flat-lay of freshly baked croissants on a rustic wooden board, scattered flour, a steaming cup of latte with latte art, soft morning light, cozy bakery aesthetic"
- CORRECT: "Before-and-after split image of a backyard renovation, left side showing overgrown grass, right side showing a beautiful patio with string lights and outdoor furniture at sunset"

Respond ONLY with valid JSON matching this schema:
{
  "strategy": string,
  "channels": [
    {
      "channel": string,
      "why": string,
      "content": {
        "variant_a": { ...channel-specific fields... },
        "variant_b": { ...channel-specific fields... }
      }
    }
  ],
  "thisWeek": [
    { "day": string, "action": string, "why": string }
  ]
}
${locale === "zh" ? "\nIMPORTANT: Respond entirely in Simplified Chinese (简体中文). All strategy text, channel content, captions, headlines, email copy, and descriptions must be in Chinese. Only keep brand names and technical terms in English." : ""}
`.trim();
}

export function getSystemPrompt(locale?: string): string {
  const base = `You are a senior marketing strategist who specializes in helping small businesses with limited budgets. You think about channel selection, budget allocation, timing, and audience — not just words.

When choosing channels, consider the business type, their likely audience, budget constraints, and LOCATION. Never suggest strategies that would waste a small budget. Be specific and actionable — give them copy they can paste and use today.

When products/services are provided, USE THEM in your campaign — weave them into ad copy, captions, hashtags, email subject lines, and image ideas. Be specific to what they actually sell, not generic category language.

When a location is provided, USE IT in your campaign:
- Reference the city/region in ad copy, hashtags, and captions (e.g. "#SanFranciscoCoffee", "Best brunch in Brooklyn")
- Suggest location-based strategies: Google Business Profile, local SEO keywords, geo-targeted ads, neighborhood partnerships
- Tailor timing to the local market (e.g. tourist seasons, local events, weather patterns)
- Use local language and cultural references that resonate with the area
- For Google Ads: include location-specific keywords and geo-targeting settings

Match the tone to the business type. A bakery should sound warm and inviting. A law firm should sound authoritative. A fitness studio should sound energetic.

Channel-specific tone guidance:
- For RedNote (小红书/xiaohongshu): Write in an authentic, lifestyle-oriented, visual-first style. Use emojis liberally. Content should feel like a genuine review or educational note, not an ad. Think "sharing a discovery with friends."
- For WeChat (微信/wechat): Write in a trust-based, personal, less promotional tone. Content should feel community-driven and relationship-focused. Moments posts should read like personal updates, not marketing blasts.

Always respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.`;
  if (locale === "zh") {
    return base + "\n\nThe user prefers Simplified Chinese. Respond entirely in Chinese (简体中文).";
  }
  return base;
}

export const SYSTEM_PROMPT = getSystemPrompt();
