"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ImageGeneratorProps {
  prompt: string;
  width?: number;
  height?: number;
  label?: string;
}

function pollinationsFallbackUrl(prompt: string, w: number, h: number): string {
  const raw = prompt.slice(0, 400).replace(/[^\w\s,.!?-]/g, " ");
  const looksLikeScene = /\b(photo|shot|image|view|close-?up|flat.?lay|overhead|aerial|bokeh|lighting|angle|style|aesthetic)\b/i.test(raw);
  const enhanced = looksLikeScene
    ? `${raw}, high resolution, sharp focus, vibrant colors`
    : `A photorealistic scene of: ${raw}. Professional photography, natural lighting, sharp detail`;
  const params = new URLSearchParams({
    width: String(Math.min(w, 1024)),
    height: String(Math.min(h, 1024)),
    seed: String(Math.floor(Math.random() * 100000)),
    referrer: "ai4smbhub.com",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?${params}`;
}

export default function ImageGenerator({
  prompt,
  width = 1024,
  height = 1024,
  label,
}: ImageGeneratorProps) {
  const t = useTranslations("imageGen");
  const displayLabel = label || t("generate");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const res = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt, width, height,
          anonId: typeof window !== "undefined" ? window.localStorage.getItem("ai4smb_anon_id") || "unknown" : "unknown",
        }),
      });
      const data = await res.json();

      if (data.image) {
        setImageUrl(data.image);
        return;
      }
    } catch {
      /* fall through to fallback */
    }

    try {
      const fallback = pollinationsFallbackUrl(prompt, width, height);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        setTimeout(() => reject(), 20000);
        img.src = fallback;
      });
      setImageUrl(fallback);
    } catch {
      setError(t("unavailable"));
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.target = "_blank";
    a.download = `ai4smb-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (imageUrl) {
    return (
      <div className="mt-3">
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={t("altText")} className="w-full" />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={download}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            ⬇ {t("download")}
          </button>
          <button
            onClick={generate}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-600 dark:border-zinc-600 dark:text-zinc-300"
          >
            🔄 {t("regenerate")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            {t("generating")}
          </>
        ) : (
          <>🎨 {displayLabel}</>
        )}
      </button>
      {error && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={generate}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {t("retry")}
          </button>
        </div>
      )}
    </div>
  );
}
