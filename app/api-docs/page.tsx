import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apiDocs");
  return {
    title: `${t("title")} — AI4SMB Insights`,
    description: "Free, rate-limited API endpoints for tools serving small businesses.",
  };
}

interface ParamRow {
  name: string;
  required: string;
  description: string;
}

interface PlannedEndpoint {
  name: string;
  description: string;
}

const CURL_EXAMPLE = `curl "https://ai4smbhub.com/api/v0/benchmark?industry=cafe&location=Austin%2C%20TX"`;

const RESPONSE_EXAMPLE = `{
  "industry": "cafe",
  "location": "Austin, TX",
  "result": {
    "summary": "Austin cafe customers split mainly into remote-working regulars and weekend social visitors, with a smaller but high-value group of specialty coffee enthusiasts.",
    "segments": [
      {
        "name": "Laptop Regulars",
        "percentage": 40,
        "color": "blue",
        "description": "Remote workers and freelancers who treat the cafe as a daytime office.",
        "characteristics": ["Visits on weekdays", "Stays 2+ hours", "Orders one drink, refills often"],
        "size": 0,
        "recommendations": ["Offer a weekday punch card", "Add reliable Wi-Fi and outlets as a stated amenity"],
        "propensityScore": "medium",
        "lifetimeValueTier": "medium",
        "intent": "A quiet, reliable place to work",
        "bestChannels": [
          { "channel": "instagram", "fit": "medium", "reason": "Visual proof of a laptop-friendly space" }
        ],
        "avoidChannels": [
          { "channel": "google", "reason": "Low intent to search for a workspace" }
        ],
        "messagingAngle": "Your desk away from your desk",
        "offerSuggestion": "Weekday 2-for-1 refill after 1pm",
        "toneGuidance": "Calm and practical",
        "reasoning": "Typical pattern for cafes near coworking and residential density in this market."
      }
    ],
    "quickWins": ["Post weekday hours and Wi-Fi availability on Google Business Profile"],
    "dataQuality": "This is a typical pattern for cafe businesses in Austin, TX, not a measurement of any specific business. Upload your own data for personalized segments."
  },
  "meta": {
    "source": "model-generated",
    "note": "These segments are model-generated estimates for this business type and location. They are not computed from other businesses' data."
  }
}`;

export default async function ApiDocsPage() {
  const t = await getTranslations("apiDocs");
  const params = t.raw("params") as ParamRow[];
  const plannedEndpoints = t.raw("plannedEndpoints") as PlannedEndpoint[];
  const termsBody = t.raw("termsBody") as string[];

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

        {/* Available now */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {t("availableNowTitle")}
          </h2>

          <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                {t("availableNowTitle")}
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{t("endpointName")}</h3>
            </div>

            <p className="mb-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t("endpointDesc")}
            </p>

            <div className="mb-5 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("methodLabel")}</span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">GET</span>
              </span>
              <span className="flex items-center gap-2 break-all">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("urlLabel")}</span>
                <code className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">/api/v0/benchmark</code>
              </span>
            </div>

            {/* Params table */}
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("paramsTitle")}
            </h4>
            <div className="mb-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                    <th className="px-4 py-2 font-semibold text-zinc-500 dark:text-zinc-400">{t("paramName")}</th>
                    <th className="px-4 py-2 font-semibold text-zinc-500 dark:text-zinc-400">{t("paramRequired")}</th>
                    <th className="px-4 py-2 font-semibold text-zinc-500 dark:text-zinc-400">{t("paramDescription")}</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, i) => (
                    <tr key={p.name} className={i < params.length - 1 ? "border-b border-zinc-100 dark:border-zinc-800" : ""}>
                      <td className="px-4 py-3 align-top font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</td>
                      <td className="px-4 py-3 align-top text-zinc-600 dark:text-zinc-300">{p.required}</td>
                      <td className="px-4 py-3 align-top leading-relaxed text-zinc-500 dark:text-zinc-400">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* curl example */}
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("curlTitle")}
            </h4>
            <pre className="mb-5 overflow-x-auto rounded-xl bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100 dark:bg-black">
              <code>{CURL_EXAMPLE}</code>
            </pre>

            {/* response example */}
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t("responseTitle")}
            </h4>
            <pre className="mb-5 overflow-x-auto rounded-xl bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100 dark:bg-black">
              <code>{RESPONSE_EXAMPLE}</code>
            </pre>

            <p className="text-xs text-zinc-400 dark:text-zinc-500">{t("rateLimitNote")}</p>
          </div>
        </section>

        {/* Planned */}
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("plannedTitle")}</h2>
          <p className="mb-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{t("plannedIntro")}</p>

          <div className="flex flex-col gap-3">
            {plannedEndpoints.map((ep) => (
              <div
                key={ep.name}
                className="flex flex-col gap-1 rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{ep.name}</h3>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {t("plannedTitle")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{ep.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Terms of use */}
        <section className="mb-10 rounded-2xl border-2 border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("termsTitle")}</h2>
          <ul className="flex flex-col gap-2.5">
            {termsBody.map((line) => (
              <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                <span className="mt-0.5 text-blue-500">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact */}
        <section className="text-center">
          <h2 className="mb-1 text-base font-bold text-zinc-900 dark:text-zinc-50">{t("contactTitle")}</h2>
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">{t("contactBody")}</p>
          <a
            href="mailto:info@ai4smbhub.com"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {t("contactEmailLabel")}
          </a>
        </section>

      </div>
    </main>
  );
}
