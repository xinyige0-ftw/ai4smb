"use client";

import { useState, useCallback } from "react";

interface ImageGeneratorProps {
  prompt: string;
  width?: number;
  height?: number;
  label?: string;
}

function buildImageUrl(prompt: string, width: number, height: number, seed: number): string {
  const clean = prompt.slice(0, 400).replace(/[^\w\s,.!?-]/g, " ");
  const enhanced = `${clean}, professional marketing material, high quality, clean design`;
  const params = new URLSearchParams({
    width: String(Math.min(width, 1024)),
    height: String(Math.min(height, 1024)),
    seed: String(seed),
    referrer: "ai4smbhub.com",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?${params}`;
}

export default function ImageGenerator({
  prompt,
  width = 1024,
  height = 1024,
  label = "Generate image",
}: ImageGeneratorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  const generate = useCallback(() => {
    setLoading(true);
    setLoaded(false);
    setError(null);
    const seed = Math.floor(Math.random() * 100000);
    setImageUrl(buildImageUrl(prompt, width, height, seed));
  }, [prompt, width, height]);

  function handleLoad() {
    setLoading(false);
    setLoaded(true);
    setRetries(0);
  }

  function handleError() {
    if (retries < 2) {
      setRetries((r) => r + 1);
      setTimeout(() => {
        const seed = Math.floor(Math.random() * 100000);
        setImageUrl(buildImageUrl(prompt, width, height, seed));
      }, 3000 * (retries + 1));
    } else {
      setLoading(false);
      setError("Image generation is temporarily unavailable. Try again in a moment.");
      setImageUrl(null);
      setRetries(0);
    }
  }

  function download() {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.target = "_blank";
    link.download = `ai4smb-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (imageUrl) {
    return (
      <div className="mt-3">
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          {!loaded && (
            <div className="flex h-48 items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <div className="flex flex-col items-center gap-2">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span className="text-xs text-zinc-500">
                  {retries > 0 ? `Retrying... (${retries}/2)` : "Generating image (~10s)..."}
                </span>
              </div>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="AI-generated marketing image"
            className={`w-full ${loaded ? "" : "hidden"}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
        {loaded && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={download}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              ⬇ Download
            </button>
            <button
              onClick={generate}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-blue-400 hover:text-blue-600 dark:border-zinc-600 dark:text-zinc-300"
            >
              🔄 Regenerate
            </button>
          </div>
        )}
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
        🎨 {label}
      </button>
      {error && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-red-500">{error}</p>
          <button
            onClick={() => { setError(null); generate(); }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
