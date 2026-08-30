import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const metadata: Metadata = {
  title: "Shared Result — AI4SMB Insights",
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getClient();
  if (!db) notFound();

  let type: "campaign" | "segment" = "campaign";
  let result: unknown = null;
  let meta: Record<string, string> = {};

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, business_type, business_name, goal, result, created_at")
    .eq("id", id)
    .single();

  if (campaign) {
    result = campaign.result;
    meta = { businessType: campaign.business_type, businessName: campaign.business_name, goal: campaign.goal, createdAt: campaign.created_at };
  } else {
    const { data: segment } = await db
      .from("segments")
      .select("id, mode, meta_label, result, created_at")
      .eq("id", id)
      .single();

    if (segment) {
      type = "segment";
      result = segment.result;
      meta = { mode: segment.mode, metaLabel: segment.meta_label, createdAt: segment.created_at };
    }
  }

  if (!result) notFound();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            AI4SMB Insights
          </Link>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Shared {type}
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 text-center">
          <p className="text-xs text-zinc-400">
            Shared on {new Date(meta.createdAt as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <SharedResultView type={type} result={result} meta={meta} />

        <div className="mt-8 rounded-xl bg-blue-600 p-6 text-center">
          <h2 className="mb-2 text-lg font-bold text-white">Want results like this?</h2>
          <p className="mb-4 text-sm text-blue-100">AI4SMB Insights is 100% free. No signup required.</p>
          <a href={type === "campaign" ? "/generate" : "/segment"} className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50">
            Try it free →
          </a>
        </div>
      </div>
    </main>
  );
}

function SharedResultView({ type, result, meta }: { type: string; result: unknown; meta: Record<string, string> }) {
  const data = result as Record<string, unknown>;

  if (type === "campaign") {
    const strategy = data.strategy as string;
    const channels = (data.channels || []) as { channel: string; why: string; content: Record<string, unknown> }[];

    return (
      <div>
        <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Marketing Campaign
        </h1>
        {meta.businessName && (
          <p className="mb-4 text-center text-sm text-zinc-500">
            For {meta.businessName} ({meta.businessType})
          </p>
        )}

        {strategy && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Strategy</h2>
            <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">{strategy}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {channels.map((ch, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="mb-2 text-sm font-bold uppercase text-zinc-900 dark:text-zinc-50">
                {ch.channel.replace("_", " ")}
              </h3>
              <p className="mb-3 text-xs text-zinc-500">{ch.why}</p>
              <div className="flex flex-col gap-3">
                {Object.entries(ch.content).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}
                    </p>
                    {value !== null && typeof value === "object" ? (
                      <div className="flex flex-col gap-1.5">
                        {Object.entries(value as Record<string, unknown>).map(([sub, subValue]) => (
                          <div key={sub}>
                            <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                              {sub.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ")}
                            </span>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                              {String(subValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {String(value)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const summary = data.summary as string;
  const segments = (data.segments || []) as { name: string; percentage: number; description: string; characteristics: string[] }[];

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Customer Segments
      </h1>
      {meta.metaLabel && (
        <p className="mb-4 text-center text-sm text-zinc-500">{meta.metaLabel}</p>
      )}

      {summary && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Key Insight</h2>
          <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">{summary}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {segments.map((seg, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{seg.name}</h3>
              <span className="text-2xl font-bold text-blue-600">{seg.percentage}%</span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{seg.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {seg.characteristics?.map((c, j) => (
                <span key={j} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
