"use client";

import { useEffect, useState } from "react";

interface UserRow {
  sessionId: string;
  anonId: string;
  userType: "authenticated" | "anonymous";
  email: string | null;
  fullName: string | null;
  businessType: string | null;
  businessName: string | null;
  location: string | null;
  locale: string;
  actionsCount: number;
  campaignsCount: number;
  segmentsCount: number;
  chatsCount: number;
  lastAction: string | null;
  firstSeen: string;
  lastSeen: string;
  reviewRating: number | null;
  reviewNps: number | null;
  reviewText: string | null;
  reviewName: string | null;
  reviewDate: string | null;
}

interface ReviewRow {
  reviewId: string;
  rating: number;
  npsScore: number | null;
  text: string;
  businessType: string | null;
  businessName: string | null;
  location: string | null;
  locale: string;
  displayName: string | null;
  email: string | null;
  fullName: string | null;
  isAnonymous: boolean;
  consentDisplay: boolean;
  consentContact: boolean;
  toolsUsed: string[];
  campaignsCount: number;
  segmentsCount: number;
  approved: boolean;
  reviewDate: string;
  sessionCampaigns: number;
  sessionSegments: number;
  sessionChats: number;
  userType: "authenticated" | "anonymous";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}>
          ★
        </span>
      ))}
    </span>
  );
}

function NpsBadge({ score }: { score: number }) {
  const color =
    score >= 9 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    : score >= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      NPS {score}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminDashboard() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"users" | "reviews">("users");
  const [filter, setFilter] = useState<"all" | "authenticated" | "anonymous">("all");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setRows(data.users || []);
        setReviews(data.reviews || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.userType !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.email?.toLowerCase().includes(q) ||
        r.fullName?.toLowerCase().includes(q) ||
        r.businessType?.toLowerCase().includes(q) ||
        r.businessName?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q) ||
        r.anonId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: rows.length,
    authenticated: rows.filter((r) => r.userType === "authenticated").length,
    anonymous: rows.filter((r) => r.userType === "anonymous").length,
    withReviews: rows.filter((r) => r.reviewRating !== null).length,
    avgRating: (() => {
      const rated = rows.filter((r) => r.reviewRating !== null);
      return rated.length > 0 ? (rated.reduce((s, r) => s + (r.reviewRating ?? 0), 0) / rated.length).toFixed(1) : "—";
    })(),
    totalCampaigns: rows.reduce((s, r) => s + r.campaignsCount, 0),
    totalSegments: rows.reduce((s, r) => s + r.segmentsCount, 0),
    totalChats: rows.reduce((s, r) => s + r.chatsCount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-sm text-zinc-500">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <p className="mt-2 text-xs text-zinc-400">You must be signed in with an admin email to access this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{stats.total}</div>
          <div className="text-xs text-zinc-500">Total visitors</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-blue-600">{stats.authenticated}</div>
          <div className="text-xs text-zinc-500">Signed in</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-amber-600">{stats.avgRating} ★</div>
          <div className="text-xs text-zinc-500">{stats.withReviews} reviews</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-2xl font-bold text-green-600">{stats.totalCampaigns + stats.totalSegments + stats.totalChats}</div>
          <div className="text-xs text-zinc-500">Total actions</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          onClick={() => setTab("users")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${tab === "users" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}
        >
          Visitors ({rows.length})
        </button>
        <button
          onClick={() => setTab("reviews")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${tab === "reviews" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {/* Reviews tab */}
      {tab === "reviews" && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search reviews by name, email, business, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:max-w-sm"
            />
          </div>
          <div className="space-y-3">
            {reviews
              .filter((r) => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (
                  r.displayName?.toLowerCase().includes(q) ||
                  r.email?.toLowerCase().includes(q) ||
                  r.businessType?.toLowerCase().includes(q) ||
                  r.location?.toLowerCase().includes(q) ||
                  r.text?.toLowerCase().includes(q)
                );
              })
              .map((r) => (
                <div key={r.reviewId} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                  {/* Header: rating + name + date */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <StarRating rating={r.rating} />
                      {r.npsScore !== null && <NpsBadge score={r.npsScore} />}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.approved ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                        {r.approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">{new Date(r.reviewDate).toLocaleDateString()} {new Date(r.reviewDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>

                  {/* Review text */}
                  {r.text && (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">&ldquo;{r.text}&rdquo;</p>
                  )}

                  {/* Detail grid */}
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3 md:grid-cols-4">
                    <div>
                      <span className="text-zinc-400">Name: </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.displayName || "—"}</span>
                      {r.isAnonymous && <span className="ml-1 text-zinc-400">(anon)</span>}
                    </div>
                    <div>
                      <span className="text-zinc-400">Email: </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.email || "—"}</span>
                    </div>
                    {r.fullName && (
                      <div>
                        <span className="text-zinc-400">Account: </span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.fullName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-400">Business: </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.businessType || "—"}</span>
                    </div>
                    {r.businessName && (
                      <div>
                        <span className="text-zinc-400">Name: </span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.businessName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-400">Location: </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.location || "—"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Language: </span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{r.locale === "zh" ? "Chinese" : "English"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">User type: </span>
                      <span className={`font-medium ${r.userType === "authenticated" ? "text-blue-600" : "text-zinc-500"}`}>{r.userType}</span>
                    </div>
                  </div>

                  {/* Activity + consent badges */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {r.toolsUsed.map((tool) => (
                      <span key={tool} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{tool}</span>
                    ))}
                    {r.sessionCampaigns > 0 && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">📣 {r.sessionCampaigns} campaigns</span>}
                    {r.sessionSegments > 0 && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">🔍 {r.sessionSegments} segments</span>}
                    {r.sessionChats > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">💬 {r.sessionChats} chats</span>}
                    {r.consentDisplay && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓ Display OK</span>}
                    {r.consentContact && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓ Contact OK</span>}
                  </div>
                </div>
              ))}
            {reviews.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-400">No reviews yet</p>
            )}
          </div>
        </>
      )}

      {/* Users tab */}
      {tab === "users" && <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "authenticated", "anonymous"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {f === "all" ? `All (${stats.total})` : f === "authenticated" ? `Signed in (${stats.authenticated})` : `Anonymous (${stats.anonymous})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by email, business, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:w-72"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">User</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Business</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Location</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 text-center">Actions</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Rating</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Last active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No users found
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.sessionId}
                onClick={() => setExpandedRow(expandedRow === r.sessionId ? null : r.sessionId)}
                className="cursor-pointer border-b border-zinc-50 transition-colors hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      r.userType === "authenticated"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {r.userType === "authenticated" ? "✓" : "?"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {r.fullName || r.email || r.reviewName || `anon-${r.anonId.slice(0, 8)}`}
                      </div>
                      {r.email && (
                        <div className="truncate text-xs text-zinc-400">{r.email}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">{r.businessType || "—"}</div>
                  {r.businessName && (
                    <div className="text-xs text-zinc-400">{r.businessName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {r.location || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {r.campaignsCount > 0 && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300" title="Campaigns">
                        📣{r.campaignsCount}
                      </span>
                    )}
                    {r.segmentsCount > 0 && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" title="Segments">
                        🔍{r.segmentsCount}
                      </span>
                    )}
                    {r.chatsCount > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" title="Chats">
                        💬{r.chatsCount}
                      </span>
                    )}
                    {r.actionsCount === 0 && (
                      <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.reviewRating !== null ? (
                    <div className="flex flex-col gap-0.5">
                      <StarRating rating={r.reviewRating} />
                      {r.reviewNps !== null && <NpsBadge score={r.reviewNps} />}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {timeAgo(r.lastSeen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail panel */}
      {expandedRow && (() => {
        const r = filtered.find((r) => r.sessionId === expandedRow);
        if (!r) return null;
        return (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div><span className="text-zinc-400">Session ID:</span> <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">{r.sessionId.slice(0, 8)}...</span></div>
              <div><span className="text-zinc-400">Anon ID:</span> <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300">{r.anonId.slice(0, 8)}...</span></div>
              <div><span className="text-zinc-400">Locale:</span> <span className="text-zinc-700 dark:text-zinc-300">{r.locale}</span></div>
              <div><span className="text-zinc-400">First seen:</span> <span className="text-zinc-700 dark:text-zinc-300">{new Date(r.firstSeen).toLocaleDateString()}</span></div>
              <div><span className="text-zinc-400">Total actions:</span> <span className="text-zinc-700 dark:text-zinc-300">{r.actionsCount}</span></div>
              <div><span className="text-zinc-400">Last action:</span> <span className="text-zinc-700 dark:text-zinc-300">{r.lastAction || "—"}</span></div>
            </div>
            {r.reviewText && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Review ({r.reviewDate ? new Date(r.reviewDate).toLocaleDateString() : ""}):</p>
                <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">&ldquo;{r.reviewText}&rdquo;</p>
              </div>
            )}
          </div>
        );
      })()}

      <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
        Showing {filtered.length} of {rows.length} visitors
      </p>
      </>}

    </div>
  );
}
