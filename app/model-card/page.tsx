import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("modelCard");
  return {
    title: `${t("title")} — AI4SMB Insights`,
    description: "Which models power this platform, and why they are open.",
  };
}

interface ModelRow {
  name: string;
  role: string;
  weights: string;
}

export default async function ModelCardPage() {
  const t = await getTranslations("modelCard");
  const models = t.raw("models") as ModelRow[];
  const whyOpen = t.raw("whyOpen") as string[];
  const limitations = t.raw("limitations") as string[];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />

      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Models in use */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("modelsTitle")}
          </h2>

          {/* Table (desktop) */}
          <div className="hidden overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white sm:block dark:border-zinc-700 dark:bg-zinc-900">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("tableModel")}
                  </th>
                  <th className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("tableRole")}
                  </th>
                  <th className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("tableWeights")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr
                    key={m.name}
                    className={i < models.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}
                  >
                    <td className="px-5 py-4 align-top font-semibold text-zinc-900 dark:text-zinc-50">
                      {m.name}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {m.role}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {m.weights}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards (mobile) */}
          <div className="flex flex-col gap-4 sm:hidden">
            {models.map((m) => (
              <div
                key={m.name}
                className="rounded-2xl border-2 border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-50">{m.name}</h3>
                <p className="mb-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{m.role}</p>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{m.weights}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why open-weight */}
        <section className="mb-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("whyOpenTitle")}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {whyOpen.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Selection */}
        <section className="mb-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("selectionTitle")}
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {t("selectionP1")}
          </p>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {t("selectionP2")}
          </p>
        </section>

        {/* Explainability */}
        <section className="mb-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("explainabilityTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {t("explainabilityBody")}
          </p>
        </section>

        {/* Known limitations */}
        <section className="mb-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("limitationsTitle")}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {limitations.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Training data */}
        <section className="rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("trainingDataTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {t("trainingDataBody")}
          </p>
        </section>
      </div>
    </main>
  );
}
