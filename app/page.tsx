import { useTranslations } from "next-intl";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import AuthButtonWrapper from "@/components/AuthButtonWrapper";
import LanguageToggle from "@/components/LanguageToggle";

export default function Home() {
  const t = useTranslations("landing");
  const c = useTranslations("common");

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      {/* Nav */}
      <nav className="border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            {c("appName")}
          </span>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
              {c("free")}
            </span>
            <LanguageToggle />
            <AuthButtonWrapper />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-zinc-100 bg-gradient-to-b from-white to-zinc-50 px-4 py-16 text-center dark:border-zinc-800 dark:from-black dark:to-zinc-950">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-block rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {t("badge")}
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("heroSubtitle")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/segment"
              className="rounded-xl bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              {t("ctaSegment")} →
            </a>
            <a
              href="/generate"
              className="rounded-xl border-2 border-zinc-200 bg-white px-8 py-4 text-sm font-semibold text-zinc-700 transition-all hover:border-zinc-300 hover:shadow-sm active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {t("ctaCampaign")}
            </a>
          </div>
          <p className="mt-5 text-xs text-zinc-400 dark:text-zinc-600">
            {t("noSignup")}
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("toolsTitle")}
          </h2>
          <p className="mb-10 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("toolsSubtitle")}
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Segmentation */}
            <a
              href="/segment"
              className="group flex flex-col rounded-2xl border-2 border-zinc-200 bg-white p-7 transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500"
            >
              <span className="mb-4 text-3xl">🔍</span>
              <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {t("segmentTitle")}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t("segmentDesc")}
              </p>
              <ul className="mb-6 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Answer 5 quick questions</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Paste your Google reviews</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Upload a spreadsheet</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Get instant industry benchmarks</li>
              </ul>
              <span className="mt-auto text-sm font-semibold text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
                Analyze my customers →
              </span>
            </a>

            {/* Campaign Generator */}
            <a
              href="/generate"
              className="group flex flex-col rounded-2xl border-2 border-zinc-200 bg-white p-7 transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500"
            >
              <span className="mb-4 text-3xl">📣</span>
              <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {t("campaignTitle")}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t("campaignDesc")}
              </p>
              <ul className="mb-6 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Instagram captions</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Email subject lines &amp; body</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Google / Facebook ad copy</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> Tailored to your business</li>
              </ul>
              <span className="mt-auto text-sm font-semibold text-blue-600 group-hover:text-blue-700 dark:text-blue-400">
                Create my campaign →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-zinc-100 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("howTitle")}
          </h2>
          <p className="mb-10 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("howSubtitle")}
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: "1", icon: "🎯", title: t("step1Title"), body: t("step1Desc") },
              { step: "2", icon: "💬", title: t("step2Title"), body: t("step2Desc") },
              { step: "3", icon: "✨", title: t("step3Title"), body: t("step3Desc") },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl dark:bg-blue-900">
                  {icon}
                </div>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-500">
                  Step {step}
                </div>
                <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for real SMBs */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {t("builtFor")}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: "☕", label: "Coffee shops & cafes" },
              { icon: "🛍️", label: "Retail boutiques" },
              { icon: "💆", label: "Salons & spas" },
              { icon: "🍽️", label: "Restaurants & food" },
              { icon: "🏋️", label: "Gyms & fitness" },
              { icon: "🔧", label: "Local services" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialCarousel />

      {/* Bottom CTA */}
      <section className="border-t border-zinc-100 bg-blue-600 px-4 py-16 text-center dark:border-zinc-800">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-3 text-2xl font-extrabold text-white">
            {t("bottomCtaTitle")}
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-blue-100">
            {t("bottomCtaDesc")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="/segment"
              className="rounded-xl bg-white px-8 py-4 text-sm font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50 active:scale-[0.98]"
            >
              {t("ctaSegment")} →
            </a>
            <a
              href="/generate"
              className="rounded-xl border-2 border-blue-400 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98]"
            >
              {t("ctaCampaign")}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{c("appName")}</span>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            {t("footerDesc")}
          </p>
        </div>
      </footer>
    </main>
  );
}
