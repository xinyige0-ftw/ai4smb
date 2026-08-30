import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "How we handle your data — AI4SMB Insights",
  description: "How the platform protects customer data uploaded by small business owners.",
};

interface FlowStep {
  title: string;
  desc: string;
}

interface Control {
  lead: string;
  body: string;
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacyPage");
  const flowSteps = t.raw("flowSteps") as FlowStep[];
  const controls = t.raw("controls") as Control[];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />

      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Section A: upload flow */}
        <section className="mb-10">
          <h2 className="mb-5 text-center text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("flowTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {flowSteps.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  {i + 1}
                </div>
                <h3 className="mb-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section B: controls */}
        <section className="mb-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("controlsTitle")}
          </h2>
          <ul className="flex flex-col gap-4">
            {controls.map((c) => (
              <li key={c.lead} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{c.lead}</span>{" "}
                {c.body}
              </li>
            ))}
          </ul>
        </section>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t.rich("footerLinks", {
            arch: (chunks) => (
              <Link href="/architecture" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </main>
  );
}
