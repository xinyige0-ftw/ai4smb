import { POST_AGENT_SYSTEM_PROMPT, buildFormatPrompt } from "@/lib/post-agent-prompts";
import { generateJSON, getDefaultProvider } from "@/lib/ai-provider";
import { getUser } from "@/lib/auth";
import { getOrCreateSession, extractSessionMeta } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { channelContent, platform, businessContext, locale, anonId } = body as {
      channelContent: { channel: string; why: string; content: Record<string, unknown> };
      platform: string;
      businessContext?: string;
      locale?: string;
      anonId?: string;
    };

    if (!channelContent || !platform) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    let userId: string | undefined;
    try {
      const user = await getUser();
      if (user) userId = user.id;
    } catch {}

    if (anonId && anonId !== "unknown") {
      const meta = extractSessionMeta(req, "format_post", locale);
      getOrCreateSession(anonId, userId, meta).catch(() => {});
    }

    const prompt = buildFormatPrompt(channelContent, platform, businessContext, locale);

    const response = await generateJSON(
      POST_AGENT_SYSTEM_PROMPT,
      prompt,
      { temperature: 0.7, maxTokens: 2000 },
      getDefaultProvider()
    );
    const text = response.text || "{}";
    const result = JSON.parse(text);

    return Response.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Format post error:", message);
    return Response.json(
      { error: "Something went wrong formatting your post." },
      { status: 500 }
    );
  }
}
