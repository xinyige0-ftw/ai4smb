import Groq from "groq-sdk";
import { getChatSystemPrompt } from "@/lib/campaign-chat-prompts";
import { getUser } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, anonId, locale } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      anonId?: string;
      locale?: string;
    };

    if (!messages || messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    let userId: string | undefined;
    try {
      const user = await getUser();
      if (user) userId = user.id;
    } catch {}

    void userId;
    void anonId;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: getChatSystemPrompt(locale) }, ...messages],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const text = completion.choices[0]?.message?.content || "";

    return Response.json({ message: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Campaign chat error:", message);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
