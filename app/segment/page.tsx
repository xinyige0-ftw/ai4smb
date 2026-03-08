import type { Metadata } from "next";
import SegmentRouter from "@/components/SegmentRouter";
import AuthButton from "@/components/AuthButtonWrapper";
import LanguageToggle from "@/components/LanguageToggle";

export const metadata: Metadata = {
  title: "Customer Segments — AI4SMB Insights",
  description: "Understand your customers with AI. Upload data, answer questions, analyze reviews, or get instant industry benchmarks.",
};

export default function SegmentPage() {
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
      <SegmentRouter />
    </main>
  );
}
