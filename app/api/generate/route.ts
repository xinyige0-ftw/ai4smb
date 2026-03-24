import { buildPrompt, getSystemPrompt, type GenerateInput } from "@/lib/prompts";
import { getOrCreateSession, saveCampaign, extractSessionMeta } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateJSON, getDefaultProvider } from "@/lib/ai-provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { anonId, input, locale } = body as { anonId?: string; input?: GenerateInput; locale?: string };

    let userId: string | undefined;
    try {
      const user = await getUser();
      if (user) userId = user.id;
    } catch {}

    if (!input?.businessType || !input?.goal) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (anonId && !checkRateLimit(anonId, "generate")) {
      return Response.json(
        { error: "You've reached the limit of 30 generations per hour. Please try again later." },
        { status: 429 }
      );
    }

    const prompt = buildPrompt(input, locale);
    const response = await generateJSON(
      getSystemPrompt(locale),
      prompt,
      { temperature: 0.9, maxTokens: 2048 },
      getDefaultProvider()
    );
    const text = response.text || "{}";
    const campaign = JSON.parse(text);

    console.log("GENERATE:", {
      anonId: anonId || "unknown",
      businessType: input.businessType,
      goal: input.goal,
      channels: campaign.channels?.map((c: { channel: string }) => c.channel),
    });

    let savedId: string | null = null;
    if (anonId && anonId !== "unknown") {
      try {
        const meta = extractSessionMeta(req, "campaign", locale);
        meta.businessType = input.businessType;
        meta.businessName = input.businessName;
        meta.location = input.location;
        const sessionId = await getOrCreateSession(anonId, userId, meta);
        savedId = await saveCampaign({
          session_id: sessionId,
          business_type: input.businessType,
          business_name: input.businessName,
          goal: input.goal,
          budget: input.budget,
          channels: input.channels,
          result: campaign,
        });
      } catch {}
    }

    return Response.json({ campaign, id: savedId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Generate error:", message);
    return Response.json(
      { error: "Something went wrong generating your campaign. Please try again.", debug: message },
      { status: 500 }
    );
  }
}
