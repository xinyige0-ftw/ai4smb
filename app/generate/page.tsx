import type { Metadata } from "next";
import AuthButton from "@/components/AuthButtonWrapper";
import LanguageToggle from "@/components/LanguageToggle";
import GeneratePageClient from "@/components/GeneratePageClient";

export const metadata: Metadata = {
  title: "AI Campaign Generator — AI4SMB Insights",
  description: "Create a personalized marketing campaign for your small business in seconds with AI.",
};

export default function GeneratePage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <a href="/" className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            AI4SMB Insights
          </a>
          <div className="flex items-center gap-3">
            <a href="/history" className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">History</a>
            <LanguageToggle />
            <AuthButton />
          </div>
        </div>
      </div>
      <GeneratePageClient />
    </main>
  );
}
