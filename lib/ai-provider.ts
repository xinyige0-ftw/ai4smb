import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export type Provider = "groq" | "gemini-flash" | "gemini-pro";
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const DEFAULT_GEMINI_FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || "gemini-2.5-flash";
const DEFAULT_GEMINI_PRO_MODEL = process.env.GEMINI_PRO_MODEL || "gemini-2.5-pro";
const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER || "groq") as Provider;
const GEMINI_LIMIT_ENABLED = process.env.GEMINI_LIMIT_ENABLED !== "false";
const GEMINI_MAX_REQUESTS_PER_MINUTE = Math.max(
  1,
  Number.parseInt(process.env.GEMINI_MAX_REQUESTS_PER_MINUTE || "60", 10) || 60
);
const GEMINI_MAX_REQUESTS_PER_DAY = Math.max(
  1,
  Number.parseInt(process.env.GEMINI_MAX_REQUESTS_PER_DAY || "1000", 10) || 1000
);
const GEMINI_BUDGET_BEHAVIOR = (process.env.GEMINI_BUDGET_BEHAVIOR || "fallback").toLowerCase();

let geminiMinuteWindow = { bucket: "", count: 0 };
let geminiDayWindow = { bucket: "", count: 0 };

function currentMinuteBucket(): string {
  return new Date().toISOString().slice(0, 16);
}

function currentDayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

function reserveGeminiBudgetSlot(): { allowed: true } | { allowed: false; reason: string } {
  if (!GEMINI_LIMIT_ENABLED) return { allowed: true };

  const minuteBucket = currentMinuteBucket();
  if (geminiMinuteWindow.bucket !== minuteBucket) {
    geminiMinuteWindow = { bucket: minuteBucket, count: 0 };
  }

  const dayBucket = currentDayBucket();
  if (geminiDayWindow.bucket !== dayBucket) {
    geminiDayWindow = { bucket: dayBucket, count: 0 };
  }

  if (geminiMinuteWindow.count >= GEMINI_MAX_REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Gemini per-minute limit reached (${GEMINI_MAX_REQUESTS_PER_MINUTE}/min)`,
    };
  }
  if (geminiDayWindow.count >= GEMINI_MAX_REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: `Gemini daily limit reached (${GEMINI_MAX_REQUESTS_PER_DAY}/day)`,
    };
  }

  // Reserve on attempt to enforce a hard budget cap.
  geminiMinuteWindow.count += 1;
  geminiDayWindow.count += 1;
  return { allowed: true };
}

function shouldFallbackGeminiError(error: unknown): boolean {
  if (GEMINI_BUDGET_BEHAVIOR !== "fallback") return false;
  const message = error instanceof Error ? error.message : String(error);
  const text = message.toLowerCase();
  return (
    text.includes("429") ||
    text.includes("quota") ||
    text.includes("resource_exhausted") ||
    text.includes("rate limit")
  );
}

function normalizeJsonText(raw: string): string {
  const trimmed = raw.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {}

  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    JSON.parse(withoutFences);
    return withoutFences;
  } catch {}

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const objectSlice = withoutFences.slice(start, end + 1);
    try {
      const parsed = JSON.parse(objectSlice);
      return JSON.stringify(parsed);
    } catch {}
  }

  return trimmed;
}

function resolveProvider(provider?: Provider): Provider {
  if (provider) return provider;
  if (DEFAULT_PROVIDER === "gemini-flash" || DEFAULT_PROVIDER === "gemini-pro" || DEFAULT_PROVIDER === "groq") {
    return DEFAULT_PROVIDER;
  }
  return "groq";
}

export async function generateWithGroq(
  system: string,
  user: string,
  options: LLMOptions = {},
  model: string = DEFAULT_GROQ_MODEL
): Promise<LLMResponse> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  const start = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system + (attempt ? "\nReturn one complete valid JSON object. Keep copy concise, escape quotes correctly, and close every array and object. Do not omit requested channels." : "") },
          { role: "user", content: user },
        ],
        temperature: attempt ? 0.2 : (options.temperature ?? 0.7),
        max_tokens: attempt ? Math.min(8000, Math.max(options.maxTokens ?? 3000, 4500)) : (options.maxTokens ?? 3000),
        ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      });
      const choice = completion.choices[0];
      const text = choice?.message?.content || "";
      if (options.jsonMode) {
        if (choice?.finish_reason === "length") throw new SyntaxError("Incomplete JSON output");
        JSON.parse(text);
      }
      return { text, provider: "groq", model, latencyMs: Date.now() - start };
    } catch (error) {
      const providerError = error as { status?: number; error?: { code?: string; error?: { code?: string } } };
      const code = providerError.error?.error?.code ?? providerError.error?.code;
      const invalidJson = options.jsonMode && (
        error instanceof SyntaxError || (providerError.status === 400 && code === "json_validate_failed")
      );
      if (!invalidJson) throw error;
      if (attempt === 0) {
        console.warn("[ai-provider] Invalid JSON output; retrying once with a concise response request");
        continue;
      }
      // Do not expose the provider's failed_generation payload to logs or clients.
      throw new Error("The model did not return complete JSON after one retry. Please try again.");
    }
  }
  throw new Error("No model response");
}

export async function generateWithGemini(
  system: string,
  user: string,
  options: LLMOptions = {},
  model: string = DEFAULT_GEMINI_FLASH_MODEL
): Promise<LLMResponse> {
  const budget = reserveGeminiBudgetSlot();
  if (!budget.allowed) {
    if (GEMINI_BUDGET_BEHAVIOR === "fallback") {
      console.warn(`[ai-provider] ${budget.reason}; falling back to Groq`);
      return generateWithGroq(system, user, options);
    }
    throw new Error(`[ai-provider] ${budget.reason}`);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 3000,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });

  const start = Date.now();
  try {
    const result = await genModel.generateContent(user);
    const text = result.response.text();
    const normalizedText = options.jsonMode ? normalizeJsonText(text) : text;

    return {
      text: normalizedText,
      provider: "gemini",
      model,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    if (shouldFallbackGeminiError(error)) {
      console.warn("[ai-provider] Gemini quota/rate error; falling back to Groq");
      return generateWithGroq(system, user, options);
    }
    throw error;
  }
}

export function getDefaultProvider(): Provider {
  return resolveProvider();
}

export async function generateJSON(
  system: string,
  user: string,
  options: LLMOptions = {},
  provider?: Provider
): Promise<LLMResponse> {
  const opts = { ...options, jsonMode: true };
  const resolvedProvider = resolveProvider(provider);

  switch (resolvedProvider) {
    case "groq":
      return generateWithGroq(system, user, opts);
    case "gemini-flash":
      return generateWithGemini(system, user, opts, DEFAULT_GEMINI_FLASH_MODEL);
    case "gemini-pro":
      return generateWithGemini(system, user, opts, DEFAULT_GEMINI_PRO_MODEL);
    default:
      return generateWithGroq(system, user, opts);
  }
}

export async function generateText(
  system: string,
  user: string,
  options: LLMOptions = {},
  provider?: Provider
): Promise<LLMResponse> {
  const resolvedProvider = resolveProvider(provider);
  switch (resolvedProvider) {
    case "groq":
      return generateWithGroq(system, user, options);
    case "gemini-flash":
      return generateWithGemini(system, user, options, DEFAULT_GEMINI_FLASH_MODEL);
    case "gemini-pro":
      return generateWithGemini(system, user, options, DEFAULT_GEMINI_PRO_MODEL);
    default:
      return generateWithGroq(system, user, options);
  }
}

export async function generateChat(
  system: string,
  messages: ChatMessage[],
  options: LLMOptions = {},
  provider?: Provider
): Promise<LLMResponse> {
  const resolvedProvider = resolveProvider(provider);
  if (resolvedProvider === "groq") {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
    const start = Date.now();
    const completion = await groq.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 3000,
      ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    });
    return {
      text: completion.choices[0]?.message?.content || "",
      provider: "groq",
      model: DEFAULT_GROQ_MODEL,
      latencyMs: Date.now() - start,
    };
  }

  // Gemini SDK here is text-first; flatten turns for cross-provider parity.
  const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
  return generateWithGemini(
    system,
    transcript,
    options,
    resolvedProvider === "gemini-pro" ? DEFAULT_GEMINI_PRO_MODEL : DEFAULT_GEMINI_FLASH_MODEL
  );
}
