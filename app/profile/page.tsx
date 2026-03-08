"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AuthButton from "@/components/AuthButtonWrapper";
import LanguageToggle from "@/components/LanguageToggle";

interface Preferences {
  businessType?: string;
  channels?: string[];
  tone?: string;
}

interface ProfileData {
  email: string;
  provider: string;
  createdAt: string;
  totalCampaigns: number;
  totalSegments: number;
  rateLimit: { used: number; limit: number; resetsAt: number | null };
  preferences?: Preferences;
}

const BUSINESS_TYPES = [
  { value: "cafe", label: "Cafe" },
  { value: "retail", label: "Retail" },
  { value: "salon", label: "Salon" },
  { value: "restaurant", label: "Restaurant" },
  { value: "home_services", label: "Home Services" },
  { value: "fitness", label: "Fitness" },
  { value: "consulting", label: "Consulting" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "trades", label: "Trades" },
  { value: "healthcare", label: "Healthcare" },
  { value: "creative", label: "Creative" },
  { value: "other", label: "Other" },
] as const;

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google_ads", label: "Google Ads" },
  { value: "tiktok", label: "TikTok" },
  { value: "sms", label: "SMS" },
  { value: "xiaohongshu", label: "Xiaohongshu" },
  { value: "wechat", label: "WeChat" },
] as const;

const TONES = [
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
  { value: "playful", label: "Playful" },
] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({});
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savePreferences = useCallback((next: Preferences) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: next }),
        });
      } finally {
        setSaving(false);
      }
    }, 500);
  }, []);

  const updatePref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        savePreferences(next);
        return next;
      });
    },
    [savePreferences],
  );

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
      .then((data: ProfileData) => {
        setProfile(data);
        if (data.preferences) setPrefs(data.preferences);
      })
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

            {/* Preferences */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                  Preferences
                </h2>
                {saving && (
                  <span className="text-xs text-zinc-400">Saving…</span>
                )}
              </div>

              <div className="flex flex-col gap-5">
                {/* Business type */}
                <div>
                  <label htmlFor="businessType" className="mb-1.5 block text-sm text-zinc-500 dark:text-zinc-400">
                    Business type
                  </label>
                  <select
                    id="businessType"
                    value={prefs.businessType ?? ""}
                    onChange={(e) => updatePref("businessType", e.target.value || undefined)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  >
                    <option value="">Select…</option>
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Preferred channels */}
                <div>
                  <span className="mb-1.5 block text-sm text-zinc-500 dark:text-zinc-400">
                    Preferred channels
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CHANNELS.map((ch) => {
                      const checked = prefs.channels?.includes(ch.value) ?? false;
                      return (
                        <label
                          key={ch.value}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const prev = prefs.channels ?? [];
                              const next = checked
                                ? prev.filter((c) => c !== ch.value)
                                : [...prev, ch.value];
                              updatePref("channels", next);
                            }}
                            className="sr-only"
                          />
                          {ch.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Default tone */}
                <div>
                  <label htmlFor="tone" className="mb-1.5 block text-sm text-zinc-500 dark:text-zinc-400">
                    Default tone
                  </label>
                  <select
                    id="tone"
                    value={prefs.tone ?? ""}
                    onChange={(e) => updatePref("tone", e.target.value || undefined)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  >
                    <option value="">Select…</option>
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-400">
                Saved preferences will pre-fill your campaigns and segment analyses.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
