import { BUSINESS_TYPES } from "@/lib/prompts";
import { buildBenchmarkPrompt, getInsightSystemPrompt, type BenchmarkInput } from "@/lib/insight-prompts";
import { generateJSON, getDefaultProvider } from "@/lib/ai-provider";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/v0/benchmark — public API. Returns model-generated industry
 * benchmark customer segments for a business type (+ optional location).
 *
 * Reuses the exact same prompt-building and generation path as the
 * "benchmark" mode of /api/segment (see components/BenchmarkMode.tsx) —
 * no separate generation logic lives here.
 */

const VALID_INDUSTRY_IDS = BUSINESS_TYPES.map((b) => b.id);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || "unknown";
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry") || "";
  const location = searchParams.get("location") || undefined;

  if (!VALID_INDUSTRY_IDS.includes(industry as (typeof VALID_INDUSTRY_IDS)[number])) {
    return jsonResponse(
      {
        error: "Missing or invalid 'industry' query parameter.",
        validValues: VALID_INDUSTRY_IDS,
      },
      400
    );
  }

  const ip = getClientIp(req);
  if (!checkRateLimit(ip, "api-benchmark")) {
    return jsonResponse(
      { error: "Rate limit exceeded. This public endpoint allows 10 requests per hour per client." },
      429
    );
  }

  try {
    const input: BenchmarkInput = { businessType: industry, location };
    const prompt = buildBenchmarkPrompt(input);
    const systemPrompt = getInsightSystemPrompt();

    const response = await generateJSON(
      systemPrompt,
      prompt,
      { temperature: 0.7, maxTokens: 3000 },
      getDefaultProvider()
    );
    const result = JSON.parse(response.text || "{}");

    return jsonResponse({
      industry,
      location: location ?? null,
      result,
      meta: {
        source: "model-generated",
        note: "These segments are model-generated estimates for this business type and location. They are not computed from other businesses' data.",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("api/v0/benchmark error:", message);
    return jsonResponse(
      { error: "Something went wrong generating benchmark segments. Please try again." },
      500
    );
  }
}
