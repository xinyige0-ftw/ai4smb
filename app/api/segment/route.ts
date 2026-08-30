import { buildSegmentPrompt, getSegmentSystemPrompt, groundCsvResult, stripUnfoundedSizes, type CsvSummary } from "@/lib/segment-prompts";
import { markLowConfidence } from "@/lib/input-sufficiency";
import { getOrCreateSession, saveSegment, extractSessionMeta } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateJSON, getDefaultProvider } from "@/lib/ai-provider";
import {
  buildInterviewPrompt,
  buildBenchmarkPrompt,
  buildReviewPrompt,
  buildSocialPrompt,
  buildTeachMePrompt,
  getInsightSystemPrompt,
  type InterviewAnswers,
  type BenchmarkInput,
  type TeachMeConversation,
} from "@/lib/insight-prompts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { anonId, mode = "csv", locale, lowConfidence, itemCount } = body as {
      anonId?: string;
      mode?: string;
      locale?: string;
      lowConfidence?: boolean;
      itemCount?: number;
    };

    let userId: string | undefined;
    try {
      const user = await getUser();
      if (user) userId = user.id;
    } catch {}

    if (anonId && !checkRateLimit(anonId)) {
      return Response.json(
        { error: "You've reached the limit of 30 analyses per hour. Please try again later." },
        { status: 429 }
      );
    }

    let prompt: string;
    let systemPrompt: string;
    let metaRowCount = 0;
    let metaColCount = 0;

    switch (mode) {
      case "csv": {
        const { summary, businessContext } = body as {
          summary?: CsvSummary;
          businessContext?: string;
        };
        if (!summary?.columns?.length || !summary?.rowCount) {
          return Response.json({ error: "No data summary provided" }, { status: 400 });
        }
        prompt = buildSegmentPrompt(summary, businessContext, locale);
        systemPrompt = getSegmentSystemPrompt(locale);
        metaRowCount = summary.rowCount;
        metaColCount = summary.columns.length;
        break;
      }
      case "interview": {
        const { answers } = body as { answers?: InterviewAnswers };
        if (!answers?.businessType) {
          return Response.json({ error: "Missing interview answers" }, { status: 400 });
        }
        prompt = buildInterviewPrompt(answers, locale);
        systemPrompt = getInsightSystemPrompt(locale);
        break;
      }
      case "benchmark": {
        const { input } = body as { input?: BenchmarkInput };
        if (!input?.businessType) {
          return Response.json({ error: "Missing business type" }, { status: 400 });
        }
        prompt = buildBenchmarkPrompt(input, locale);
        systemPrompt = getInsightSystemPrompt(locale);
        break;
      }
      case "reviews": {
        const { reviewText, businessType } = body as {
          reviewText?: string;
          businessType?: string;
        };
        if (!reviewText?.trim()) {
          return Response.json({ error: "No review text provided" }, { status: 400 });
        }
        prompt = buildReviewPrompt(reviewText, businessType, locale);
        systemPrompt = getInsightSystemPrompt(locale);
        break;
      }
      case "social": {
        const { socialContent, businessType } = body as {
          socialContent?: string;
          businessType?: string;
        };
        if (!socialContent?.trim()) {
          return Response.json({ error: "No social content provided" }, { status: 400 });
        }
        prompt = buildSocialPrompt(socialContent, businessType, locale);
        systemPrompt = getInsightSystemPrompt(locale);
        break;
      }
      case "teachme": {
        const { conversation } = body as { conversation?: TeachMeConversation };
        if (!conversation?.qas?.length) {
          return Response.json({ error: "No conversation data provided" }, { status: 400 });
        }
        prompt = buildTeachMePrompt(conversation, locale);
        systemPrompt = getInsightSystemPrompt(locale);
        break;
      }
      default:
        return Response.json({ error: "Unknown mode" }, { status: 400 });
    }

    const response = await generateJSON(
      systemPrompt,
      prompt,
      { temperature: 0.7, maxTokens: 3000 },
      getDefaultProvider()
    );
    const text = response.text || "{}";
    const parsedResult = JSON.parse(text);
    // These four modes never analyse an uploaded dataset — any `size` the
    // model returns for them is invented, so it's stripped post-generation.
    const NO_DATASET_MODES = new Set(["benchmark", "interview", "reviews", "social"]);
    let result = mode === "csv"
      ? groundCsvResult(parsedResult, body.summary?.computedFacts, locale)
      : NO_DATASET_MODES.has(mode)
        ? stripUnfoundedSizes(parsedResult, locale)
        : parsedResult;

    if ((mode === "reviews" || mode === "social") && lowConfidence) {
      result = markLowConfidence(result, itemCount ?? 0, locale);
    }

    console.log("SEGMENT:", {
      anonId: anonId || "unknown",
      mode,
      segmentCount: result.segments?.length,
    });

    let savedId: string | null = null;
    if (anonId && anonId !== "unknown") {
      const metaLabel = body.metaLabel as string | undefined;
      try {
        const meta = extractSessionMeta(req, "segment", locale);
        if (mode === "interview" && body.answers) {
          meta.businessType = body.answers.businessType;
          meta.businessName = body.answers.businessName;
          meta.location = body.answers.location;
        } else if (mode === "benchmark" && body.input) {
          meta.businessType = body.input.businessType;
          meta.location = body.input.location;
        } else if ((mode === "reviews" || mode === "social") && body.businessType) {
          meta.businessType = body.businessType;
        }
        const sessionId = await getOrCreateSession(anonId, userId, meta);
        savedId = await saveSegment({
          session_id: sessionId,
          mode,
          result,
          meta_label: metaLabel,
        });
      } catch {}
    }

    return Response.json({
      result,
      id: savedId,
      meta: { rowCount: metaRowCount, columnCount: metaColCount, mode },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Segment error:", message);
    return Response.json(
      { error: "Something went wrong analyzing your data. Please try again.", debug: message },
      { status: 500 }
    );
  }
}
