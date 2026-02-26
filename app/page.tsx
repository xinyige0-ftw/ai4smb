export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          AI4SMB Insights
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Free AI-powered marketing for small businesses.
          Create a personalized campaign in seconds — no experience needed.
        </p>
        <a
          href="/generate"
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
        >
          Create my campaign →
        </a>
        <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500">
          No signup required · 100% free · Powered by AI
        </p>
      </div>
    </main>
  );
}
