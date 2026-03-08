"use client";

import { useState } from "react";
import GenerateWizard from "./GenerateWizard";
import CampaignChat from "./CampaignChat";

type Mode = "wizard" | "chat";

export default function GeneratePageClient() {
  const [mode, setMode] = useState<Mode>("wizard");

  return (
    <>
      {/* Mode toggle */}
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 pt-4 sm:pt-6">
        <button
          onClick={() => setMode("wizard")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            mode === "wizard"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          Form
        </button>
        <button
          onClick={() => setMode("chat")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            mode === "chat"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          Chat with AI
        </button>
      </div>

      {mode === "wizard" ? (
        <GenerateWizard />
      ) : (
        <CampaignChat onBack={() => setMode("wizard")} />
      )}
    </>
  );
}
