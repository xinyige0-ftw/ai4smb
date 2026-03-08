"use client";

import { useEffect, useState } from "react";
import AuthButton from "@/components/AuthButtonWrapper";
import LanguageToggle from "@/components/LanguageToggle";

interface ProfileData {
  email: string;
  provider: string;
  createdAt: string;
  totalCampaigns: number;
  totalSegments: number;
  rateLimit: { used: number; limit: number; resetsAt: number | null };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const anonId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ai4smb_anon_id") || ""
        : "";

    fetch(`/api/profile?anonId=${encodeURIComponent(anonId)}`)
      .then((r) => {
        if (r.status === 401) throw new Error("not_authenticated");
        if (!r.ok) throw new Error("fetch_failed");
        return r.json();
      })
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const providerLabel = profile?.provider === "google" ? "Google" : "Magic link";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Nav */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <a href="/" className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            AI4SMB Insights
          </a>
          <div className="flex items-center gap-3">
            <a href="/segment" className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">Segments</a>
            <a href="/generate" className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">Campaigns</a>
            <a href="/history" className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">History</a>
            <LanguageToggle />
            <AuthButton />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {loading && (
          <div className="py-16 text-center text-sm text-zinc-400">Loading profile...</div>
        )}

        {error === "not_authenticated" && !loading && (
          <div className="py-16 text-center">
            <div className="mb-3 text-4xl">🔒</div>
            <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">Sign in to view your profile</p>
            <p className="mb-6 text-sm text-zinc-400">
              Your profile shows usage stats, preferences, and account details.
            </p>
            <AuthButton />
          </div>
        )}

        {error && error !== "not_authenticated" && !loading && (
          <div className="py-16 text-center text-sm text-red-500">
            Something went wrong loading your profile. Please try again.
          </div>
        )}

        {profile && !loading && (
          <div className="flex flex-col gap-6">
            <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Your Profile
            </h1>

            {/* Account info */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                Account
              </h2>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Email</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Sign-in method</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{providerLabel}</span>
                </div>
                {memberSince && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Member since</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{memberSince}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Usage stats */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                Usage Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {profile.totalCampaigns}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Campaigns generated</div>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4 text-center dark:bg-zinc-800">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {profile.totalSegments}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Segments analyzed</div>
                </div>
              </div>
            </div>

            {/* Rate limit */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                Rate Limit
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Usage this hour</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {profile.rateLimit.used} of {profile.rateLimit.limit} used
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    profile.rateLimit.used >= profile.rateLimit.limit
                      ? "bg-red-500"
                      : profile.rateLimit.used >= profile.rateLimit.limit * 0.7
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${(profile.rateLimit.used / profile.rateLimit.limit) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Limits reset every hour. Applies to campaign generation and segment analysis.
              </p>
            </div>

            {/* Quick links */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                Quick Links
              </h2>
              <a
                href="/history"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span>View history</span>
                <span className="text-zinc-400">→</span>
              </a>
            </div>

            {/* Preferences (placeholder) */}
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
              <h2 className="mb-3 text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                Preferences
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Business type</span>
                  <span className="text-xs text-zinc-400 italic">Coming soon</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Preferred channels</span>
                  <span className="text-xs text-zinc-400 italic">Coming soon</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Saved preferences will pre-fill your campaigns and segment analyses.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
