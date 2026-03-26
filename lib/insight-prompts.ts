import { BUSINESS_TYPES } from "@/lib/prompts";

const SEGMENT_OUTPUT_SCHEMA = `
Respond ONLY with valid JSON matching this schema:
{
  "summary": "2-3 sentence overview of the customer base and key insight",
  "segments": [
    {
      "name": "Memorable segment name",
      "percentage": number (0-100, all segments sum to ~100),
      "color": "one of: blue, green, amber, rose, purple, cyan",
      "description": "Who are these people, 1-2 sentences",
      "characteristics": ["trait 1", "trait 2", "trait 3"],
      "size": number (estimated count, 0 if unknown),
      "recommendations": ["specific action 1", "specific action 2"],
      "propensityScore": "high" | "medium" | "low" (likelihood to convert),
      "lifetimeValueTier": "high" | "medium" | "low" (estimated customer value),
      "intent": "what this segment is looking for (e.g. 'convenience seekers', 'deal hunters')",
      "bestChannels": [
        { "channel": "channel name", "fit": "high" | "medium", "reason": "why this channel works" }
      ],
      "avoidChannels": [
        { "channel": "channel name", "reason": "why this would waste budget" }
      ],
      "messagingAngle": "the key message that resonates with this segment",
      "offerSuggestion": "specific promotion or content idea",
      "toneGuidance": "how to speak to this segment (e.g. casual, premium, urgent)",
      "reasoning": "plain-English explanation of why this segment was identified and why these recommendations"
    }
  ],
  "quickWins": [
    "Specific, immediately actionable recommendation for this week"
  ],
  "dataQuality": "One sentence on reliability of these segments and what simple data to start tracking"
}`;

export function getInsightSystemPrompt(locale?: string): string {
  const base = `You are a customer analytics expert helping small business owners understand their customers. You create actionable, specific segments — not generic personas.

Segment names should be memorable and specific (e.g. "Friday Night Regulars" not "Loyal Customers"). Recommendations must be concrete and doable without a big budget or team.

When a location is provided, USE IT in your analysis:
- Consider local demographics, foot traffic patterns, and regional preferences
- Tailor channel recommendations to the local market (e.g. Nextdoor for suburban areas, Instagram for urban areas)
- Reference the area in messaging angles and offer suggestions
- Factor in local competition, tourist vs. resident mix, seasonal patterns for that area

For each segment, also provide:
- propensityScore and lifetimeValueTier based on the information available.
- intent: a concise phrase describing what drives this segment.
- bestChannels: 1-3 marketing channels with fit level and reasoning. Consider the business type and segment behavior when recommending channels.
- avoidChannels: channels that would waste budget for this segment, with reasoning.
- messagingAngle, offerSuggestion, and toneGuidance: concrete creative direction tailored to the segment.
- reasoning: a plain-English explanation connecting the segment to the evidence and recommendations.

When working from limited information, be honest about what's inferred vs. observed, but still deliver useful segments grounded in the actual information provided. Percentages should sum to approximately 100%.

Always respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.`;
  if (locale === "zh") return base + "\n\nRespond entirely in Simplified Chinese (简体中文).";
  return base;
}

export const INSIGHT_SYSTEM_PROMPT = getInsightSystemPrompt();

// ─── INTERVIEW MODE ───────────────────────────────────────────────

export const CUSTOMER_TYPES = [
  { id: "families", label: "Families" },
  { id: "young_pros", label: "Young Professionals" },
  { id: "seniors", label: "Seniors" },
  { id: "students", label: "Students" },
  { id: "tourists", label: "Tourists / Visitors" },
  { id: "local_regulars", label: "Local Regulars" },
  { id: "business_clients", label: "Business Clients" },
  { id: "couples", label: "Couples" },
  { id: "remote_workers", label: "Remote Workers" },
];

export const VISIT_FREQUENCIES = [
  { id: "weekly_plus", label: "Weekly or more" },
  { id: "few_per_month", label: "A few times a month" },
  { id: "monthly", label: "About once a month" },
  { id: "rarely", label: "Rarely / one-time visits" },
];

export const DISCOVERY_CHANNELS = [
  { id: "walk_in", label: "Walk by / foot traffic" },
  { id: "google", label: "Google Search" },
  { id: "word_of_mouth", label: "Word of mouth" },
  { id: "social_media", label: "Social media" },
  { id: "ads", label: "Paid ads" },
  { id: "events", label: "Events / partnerships" },
  { id: "returning", label: "Repeat customers" },
];

export interface InterviewAnswers {
  businessType: string;
  businessName?: string;
  location?: string;
  customerTypes: string[];
  visitFrequency: string;
  hasVIPs: string;
  vipDescription?: string;
  discoveryChannels: string[];
  extraNotes?: string;
}

export function buildInterviewPrompt(answers: InterviewAnswers, locale?: string): string {
  const businessLabel =
    BUSINESS_TYPES.find((b) => b.id === answers.businessType)?.label ||
    answers.businessType;

  const customerTypeLabels = answers.customerTypes
    .map((id) => CUSTOMER_TYPES.find((c) => c.id === id)?.label || id)
    .join(", ");

  const discoveryLabels = answers.discoveryChannels
    .map((id) => DISCOVERY_CHANNELS.find((d) => d.id === id)?.label || id)
    .join(", ");

  return `
Analyze a small business owner's knowledge of their customers and create actionable audience segments.

Business: ${answers.businessName || "the business"} (${businessLabel})
${answers.location ? `Location: ${answers.location}` : ""}

What the owner told us about their customers:
- Customer types they see: ${customerTypeLabels || "not specified"}
- How often regulars return: ${answers.visitFrequency || "not specified"}
- VIP/high-value customers: ${answers.hasVIPs}${answers.vipDescription ? ` — "${answers.vipDescription}"` : ""}
- How customers find them: ${discoveryLabels || "not specified"}
${answers.extraNotes ? `- Additional notes: "${answers.extraNotes}"` : ""}

Create 3-5 distinct customer segments grounded in what the owner described. Don't invent groups with no basis in their answers. If information is limited, make reasonable inferences and flag them.
${answers.location ? `\nThe business is located in ${answers.location}. Factor this into your segment analysis — consider local demographics, foot traffic patterns, and area-specific customer behavior. Tailor channel and messaging recommendations to this location.` : ""}

For each segment, use what the owner told you to craft specific, recognizable names (e.g. "Morning Commuters" not "Regular Customers") and concrete recommendations they can act on immediately.

In quickWins, suggest 2-3 actions the owner can take THIS WEEK based on what they shared.
In dataQuality, suggest one simple thing to start tracking (e.g. "ask every new customer how they found you").

${SEGMENT_OUTPUT_SCHEMA}
${locale === "zh" ? "\nIMPORTANT: Respond entirely in Simplified Chinese (简体中文). Segment names, descriptions, characteristics, recommendations, and all text must be in Chinese." : ""}
`.trim();
}

// ─── BENCHMARK MODE ───────────────────────────────────────────────

export interface BenchmarkInput {
  businessType: string;
  location?: string;
  yearsInBusiness?: string;
  customerVolume?: string;
  biggestChallenge?: string;
}

const YEARS_LABELS: Record<string, string> = {
  under_1: "less than 1 year",
  "1_to_3": "1-3 years",
  "3_to_10": "3-10 years",
  "10_plus": "10+ years",
};

const VOLUME_LABELS: Record<string, string> = {
  under_50: "fewer than 50 customers/month",
  "50_200": "50-200 customers/month",
  "200_1000": "200-1,000 customers/month",
  "1000_plus": "1,000+ customers/month",
};

const CHALLENGE_LABELS: Record<string, string> = {
  new_customers: "getting new customers",
  retention: "retaining existing customers",
  standing_out: "standing out from competitors",
  online_presence: "growing online presence",
};

export function buildBenchmarkPrompt(input: BenchmarkInput, locale?: string): string {
  const businessLabel =
    BUSINESS_TYPES.find((b) => b.id === input.businessType)?.label ||
    input.businessType;

  const contextLines: string[] = [];
  if (input.yearsInBusiness) contextLines.push(`Years in business: ${YEARS_LABELS[input.yearsInBusiness] || input.yearsInBusiness}`);
  if (input.customerVolume) contextLines.push(`Monthly customer volume: ${VOLUME_LABELS[input.customerVolume] || input.customerVolume}`);
  if (input.biggestChallenge) contextLines.push(`Biggest challenge: ${CHALLENGE_LABELS[input.biggestChallenge] || input.biggestChallenge}`);
  const contextBlock = contextLines.length
    ? `\nAdditional context about this business:\n${contextLines.map(l => `- ${l}`).join("\n")}\n\nUse this context to tailor segment sizes, recommendations, and quick wins to this business's specific stage and challenges.`
    : "";

  return `
You are an expert in U.S. small business customer analytics with deep knowledge of industry patterns.

Business type: ${businessLabel}
${input.location ? `Location: ${input.location}` : "Location: United States (general)"}
${contextBlock}

Based on your knowledge of typical customer patterns for ${businessLabel} businesses${input.location ? ` in ${input.location}` : " in the U.S."}, identify the 3-5 most common customer segments. Ground these in real industry patterns — who typically visits this type of business, why, how often, and what they value.

${input.location ? `Factor in the demographics, lifestyle, and market characteristics specific to ${input.location}. Consider local competition, foot traffic patterns, income levels, and cultural preferences typical of this area.` : ""}

These are industry benchmarks, not data from this specific business. In the dataQuality field, say clearly that these are typical patterns for this business type${input.location ? ` in ${input.location}` : ""} and encourage the owner to upload their own data or answer questions about their specific customers to get personalized insights.

${SEGMENT_OUTPUT_SCHEMA}
${locale === "zh" ? "\nIMPORTANT: Respond entirely in Simplified Chinese (简体中文). Segment names, descriptions, characteristics, recommendations, and all text must be in Chinese." : ""}
`.trim();
}

// ─── REVIEW ANALYSIS ──────────────────────────────────────────────

export function buildReviewPrompt(reviewText: string, businessType?: string, locale?: string): string {
  const businessLabel = businessType
    ? BUSINESS_TYPES.find((b) => b.id === businessType)?.label || businessType
    : null;

  return `
Analyze these customer reviews to identify distinct audience segments.

${businessLabel ? `Business type: ${businessLabel}` : ""}

Customer reviews:
"""
${reviewText.slice(0, 8000)}
"""

Identify 3-5 customer segments visible in these reviews, based on:
- Who's writing (demographic clues, context they mention, vocabulary)
- What different groups value (price, quality, service, atmosphere, specific items)
- Relationship with the business (first-timers vs regulars, occasion-based vs habitual)
- Loyalty and sentiment signals

Use actual themes and language from the reviews to ground each segment. Don't create segments not supported by the text. Give segments names that reflect what reviewers actually say (e.g. "Weekend Brunch Crowd" or "Work Lunch Regulars").

In dataQuality, note that review writers are a self-selected group (skewed toward strong opinions) and suggest other sources to cross-check these segments.

${SEGMENT_OUTPUT_SCHEMA}
${locale === "zh" ? "\nIMPORTANT: Respond entirely in Simplified Chinese (简体中文). Segment names, descriptions, characteristics, recommendations, and all text must be in Chinese." : ""}
`.trim();
}

// ─── SOCIAL ANALYSIS ──────────────────────────────────────────────

export function buildSocialPrompt(socialContent: string, businessType?: string, locale?: string): string {
  const businessLabel = businessType
    ? BUSINESS_TYPES.find((b) => b.id === businessType)?.label || businessType
    : null;

  return `
Analyze a small business's social media presence to understand their audience segments.

${businessLabel ? `Business type: ${businessLabel}` : ""}

Social media content (bio, posts, captions, comments, follower descriptions, engagement data):
"""
${socialContent.slice(0, 5000)}
"""

Based on this content, identify 3-5 customer segments by inferring:
- Who engages with different types of posts (topics, products, offers)
- Language and demographics visible in comments or follower descriptions
- What content drives the most engagement and who that audience likely is
- What the business emphasizes and who that naturally attracts
- For RedNote (小红书) content: analyze note titles, body text, comments, likes/saves patterns, hashtag usage
- For WeChat content: analyze Moments engagement, Official Account article reads/shares, comment sentiment

Ground segments in what was actually provided. Note what's inferred.
In dataQuality, note the limitations (social followers ≠ all customers) and suggest what to track.

${SEGMENT_OUTPUT_SCHEMA}
${locale === "zh" ? "\nIMPORTANT: Respond entirely in Simplified Chinese (简体中文). Segment names, descriptions, characteristics, recommendations, and all text must be in Chinese." : ""}
`.trim();
}

// ─── TEACH ME MODE ────────────────────────────────────────────────

export const TEACH_ME_QUESTIONS = [
  "What type of business do you run, and where is it located?",
  "Describe a typical customer — who are they, and why do they come to you?",
  "Do you notice different types of customers? Tell me about the distinct groups you see.",
  "Which customers come back most often, and which ones tend to spend the most?",
  "What's the biggest challenge you face with your customers right now?",
];

export interface TeachMeQA {
  question: string;
  answer: string;
}

export interface TeachMeConversation {
  qas: TeachMeQA[];
}

export function buildTeachMePrompt(conversation: TeachMeConversation, locale?: string): string {
  const qaText = conversation.qas
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nOwner: ${qa.answer}`)
    .join("\n\n");

  return `
You are analyzing a conversation where a business owner described their customers in their own words.

Conversation:
${qaText}

Based on this conversation, identify 3-5 distinct customer segments. Draw directly from what the owner said — use their language and descriptions. Make segment names feel like the owner would recognize and use them themselves.

For each segment, ground every characteristic and recommendation in what they told you. If they mentioned a challenge, make your quickWins address it directly.

In dataQuality, suggest one simple tracking habit they can start tomorrow.

${SEGMENT_OUTPUT_SCHEMA}
${locale === "zh" ? "\nIMPORTANT: Respond entirely in Simplified Chinese (简体中文). Segment names, descriptions, characteristics, recommendations, and all text must be in Chinese." : ""}
`.trim();
}
