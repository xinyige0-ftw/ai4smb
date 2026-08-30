import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface DashboardRecentItem {
  type: "campaign" | "segment";
  name: string;
  business_type?: string;
  created_at: string;
}

export interface DashboardBenchmark {
  avgChannelsPerCampaign?: number;
  mostCommonGoal?: string;
}

export interface DashboardStats {
  campaigns: number;
  segments: number;
  chats: number;
  channelsUsed: string[];
  goalsUsed: Record<string, number>;
  businessTypes: string[];
  recent: DashboardRecentItem[];
  benchmark?: DashboardBenchmark;
}

interface CampaignRow {
  id: string;
  name: string | null;
  business_type: string | null;
  business_name: string | null;
  goal: string | null;
  channels: string[] | null;
  created_at: string;
}

interface SegmentRow {
  id: string;
  name: string | null;
  mode: string;
  meta_label: string | null;
  created_at: string;
}

/**
 * Computes the signed-in user's "My marketing" dashboard directly from
 * Supabase. Exported so the /dashboard server page can call it in-process
 * instead of round-tripping through this HTTP route (same pattern as
 * getImpactStats in app/api/impact/route.ts).
 *
 * Every field is populated independently from real rows — nothing here is
 * ever invented or backfilled with placeholder data. The benchmark block is
 * omitted entirely if platform-wide figures aren't available.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const stats: DashboardStats = {
    campaigns: 0,
    segments: 0,
    chats: 0,
    channelsUsed: [],
    goalsUsed: {},
    businessTypes: [],
    recent: [],
  };

  const db = getClient();
  if (!db) return stats;

  const { data: sessions } = await db.from("sessions").select("id").eq("user_id", userId);
  const sessionIds = (sessions ?? []).map((s) => s.id as string);

  if (sessionIds.length > 0) {
    const [campaignsRes, segmentsRes, chatsRes] = await Promise.allSettled([
      db
        .from("campaigns")
        .select("id, name, business_type, business_name, goal, channels, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false }),
      db
        .from("segments")
        .select("id, name, mode, meta_label, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false }),
      db.from("chats").select("id", { count: "exact", head: true }).in("session_id", sessionIds),
    ]);

    let campaigns: CampaignRow[] = [];
    if (campaignsRes.status === "fulfilled" && !campaignsRes.value.error) {
      campaigns = (campaignsRes.value.data ?? []) as CampaignRow[];
      stats.campaigns = campaigns.length;
    } else if (campaignsRes.status === "fulfilled") {
      console.error("Dashboard stats: campaigns error:", campaignsRes.value.error?.message);
    }

    let segments: SegmentRow[] = [];
    if (segmentsRes.status === "fulfilled" && !segmentsRes.value.error) {
      segments = (segmentsRes.value.data ?? []) as SegmentRow[];
      stats.segments = segments.length;
    } else if (segmentsRes.status === "fulfilled") {
      console.error("Dashboard stats: segments error:", segmentsRes.value.error?.message);
    }

    if (chatsRes.status === "fulfilled" && !chatsRes.value.error) {
      stats.chats = chatsRes.value.count ?? 0;
    } else if (chatsRes.status === "fulfilled") {
      console.error("Dashboard stats: chats error:", chatsRes.value.error?.message);
    }

    const channelSet = new Set<string>();
    campaigns.forEach((c) => {
      (c.channels ?? []).forEach((ch) => {
        if (ch && ch !== "smart") channelSet.add(ch);
      });
    });
    stats.channelsUsed = Array.from(channelSet);

    const goalsMap: Record<string, number> = {};
    campaigns.forEach((c) => {
      if (c.goal) goalsMap[c.goal] = (goalsMap[c.goal] ?? 0) + 1;
    });
    stats.goalsUsed = goalsMap;

    const businessTypeSet = new Set<string>();
    campaigns.forEach((c) => {
      if (c.business_type) businessTypeSet.add(c.business_type);
    });
    stats.businessTypes = Array.from(businessTypeSet);

    const recentCampaigns: DashboardRecentItem[] = campaigns.map((c) => ({
      type: "campaign",
      name: c.name || c.business_name || c.business_type || "Campaign",
      business_type: c.business_type ?? undefined,
      created_at: c.created_at,
    }));
    const recentSegments: DashboardRecentItem[] = segments.map((s) => ({
      type: "segment",
      name: s.name || s.meta_label || s.mode,
      created_at: s.created_at,
    }));

    stats.recent = [...recentCampaigns, ...recentSegments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }

  // ─── Platform-wide benchmark (all users, not just this one) ───────
  const [allChannelsRes, allGoalsRes] = await Promise.allSettled([
    db.from("campaigns").select("channels"),
    db.from("campaigns").select("goal").not("goal", "is", null),
  ]);

  let avgChannelsPerCampaign: number | undefined;
  if (allChannelsRes.status === "fulfilled" && !allChannelsRes.value.error) {
    const rows = (allChannelsRes.value.data ?? []) as { channels: string[] | null }[];
    const withChannels = rows.filter((r) => Array.isArray(r.channels) && r.channels.length > 0);
    if (withChannels.length > 0) {
      const total = withChannels.reduce(
        (sum, r) => sum + (r.channels ?? []).filter((c) => c !== "smart").length,
        0
      );
      avgChannelsPerCampaign = Math.round((total / withChannels.length) * 10) / 10;
    }
  } else if (allChannelsRes.status === "fulfilled") {
    console.error("Dashboard stats: platform channels error:", allChannelsRes.value.error?.message);
  }

  let mostCommonGoal: string | undefined;
  if (allGoalsRes.status === "fulfilled" && !allGoalsRes.value.error) {
    const rows = (allGoalsRes.value.data ?? []) as { goal: string | null }[];
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.goal) counts[r.goal] = (counts[r.goal] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) mostCommonGoal = sorted[0][0];
  } else if (allGoalsRes.status === "fulfilled") {
    console.error("Dashboard stats: platform goals error:", allGoalsRes.value.error?.message);
  }

  if (avgChannelsPerCampaign !== undefined || mostCommonGoal !== undefined) {
    stats.benchmark = {
      ...(avgChannelsPerCampaign !== undefined ? { avgChannelsPerCampaign } : {}),
      ...(mostCommonGoal !== undefined ? { mostCommonGoal } : {}),
    };
  }

  return stats;
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const stats = await getDashboardStats(user.id);
  return Response.json(stats);
}
