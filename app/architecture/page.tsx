import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "How AI4SMB Insights is built — AI4SMB Insights",
  description: "The system that powers the platform, in plain terms.",
};

interface Row {
  layer: string;
  implementation: string;
  what: string;
}

export default async function ArchitecturePage() {
  const t = await getTranslations("architecture");
  const rows = t.raw("rows") as Row[];
  const roadmap = t.raw("roadmap") as string[];

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <NavBar />

      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>

        {/* Table (desktop) */}
        <div className="hidden overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white sm:block dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                <th className="w-1/6 px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                  {t("tableLayer")}
                </th>
                <th className="w-1/2 px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                  {t("tableImplementation")}
                </th>
                <th className="px-5 py-3 font-semibold text-zinc-500 dark:text-zinc-400">
                  {t("tableWhatItDoes")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.layer}
                  className={i < rows.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}
                >
                  <td className="px-5 py-4 align-top font-semibold text-zinc-900 dark:text-zinc-50">
                    {row.layer}
                  </td>
                  <td className="px-5 py-4 align-top leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {row.implementation}
                  </td>
                  <td className="px-5 py-4 align-top leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {row.what}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stacked cards (mobile) */}
        <div className="flex flex-col gap-4 sm:hidden">
          {rows.map((row) => (
            <div
              key={row.layer}
              className="rounded-2xl border-2 border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-50">
                {row.layer}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {row.implementation}
              </p>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {row.what}
              </p>
            </div>
          ))}
        </div>

        {/* Roadmap */}
        <div className="mt-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("roadmapTitle")}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {roadmap.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t.rich("footerLinks", {
            privacy: (chunks) => (
              <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {chunks}
              </Link>
            ),
            model: (chunks) => (
              <Link href="/model-card" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </main>
  );
}
