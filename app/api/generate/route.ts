import Groq from "groq-sdk";
import { buildPrompt, SYSTEM_PROMPT, type GenerateInput } from "@/lib/prompts";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 10;

function checkRateLimit(anonId: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(anonId);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(anonId, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { anonId, input } = body as { anonId?: string; input?: GenerateInput };

    if (!input?.businessType || !input?.goal) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (anonId && !checkRateLimit(anonId)) {
      return Response.json(
        { error: "You've reached the limit of 10 generations per hour. Please try again later." },
        { status: 429 }
      );
    }

    const prompt = buildPrompt(input);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const campaign = JSON.parse(text);

    console.log("GENERATE:", {
      anonId: anonId || "unknown",
      businessType: input.businessType,
      goal: input.goal,
      budget: input.budget,
      channels: input.channels,
      generatedChannels: campaign.channels?.map((c: { channel: string }) => c.channel),
    });

    return Response.json({ campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Generate error:", message);
    return Response.json(
      { error: "Something went wrong generating your campaign. Please try again.", debug: message },
      { status: 500 }
    );
  }
}
