const TOGETHER_KEY = process.env.TOGETHER_API_KEY;
const HF_KEY = process.env.HF_API_KEY;

async function tryTogether(prompt: string, width: number, height: number): Promise<string | null> {
  if (!TOGETHER_KEY) return null;
  try {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOGETHER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        width: Math.min(width, 1024),
        height: Math.min(height, 1024),
        steps: 4,
        n: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.url || null;
  } catch {
    return null;
  }
}

async function tryHuggingFace(prompt: string): Promise<string | null> {
  if (!HF_KEY) return null;
  try {
    const res = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("image")) {
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = contentType.includes("png") ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${base64}`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { prompt, width = 1024, height = 1024 } = (await req.json()) as {
      prompt: string;
      width?: number;
      height?: number;
    };

    if (!prompt) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }

    const enhanced = `${prompt.slice(0, 500)}, professional marketing photo, high quality, clean composition`;

    // Try Together AI first (fastest, free unlimited)
    const togetherUrl = await tryTogether(enhanced, width, height);
    if (togetherUrl) {
      return Response.json({ image: togetherUrl, source: "together" });
    }

    // Fallback to Hugging Face (free tier, new router endpoint)
    const hfUrl = await tryHuggingFace(enhanced);
    if (hfUrl) {
      return Response.json({ image: hfUrl, source: "huggingface" });
    }

    // Both failed — client will try Pollinations as final fallback
    return Response.json(
      { error: "Image generation temporarily unavailable" },
      { status: 502 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Imagine error:", msg);
    return Response.json({ error: "Image generation failed" }, { status: 500 });
  }
}
