import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

let _client: SupabaseClient | null = null;

export function extractSessionMeta(req: Request, action: string, locale?: string): SessionMeta {
  const ua = req.headers.get("user-agent") || undefined;
  const ref = req.headers.get("referer") || undefined;
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || undefined;
  const ipHash = ip ? createHash("sha256").update(ip + "ai4smb").digest("hex").slice(0, 16) : undefined;
  return { locale, userAgent: ua, action, referrer: ref, ipHash };
}

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

// ─── SESSION HELPERS ──────────────────────────────────────────────

export interface SessionMeta {
  locale?: string;
  userAgent?: string;
  action?: string;
  referrer?: string;
  ipHash?: string;
  businessType?: string;
  businessName?: string;
  location?: string;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function getOrCreateSession(
  anonId: string,
  userId?: string,
  meta?: SessionMeta,
): Promise<string | null> {
  const db = getClient();
  if (!db || !anonId || anonId === "unknown") return null;

  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS).toISOString();

  // Look for an active session (last activity within timeout window)
  const { data: existing } = await db
    .from("sessions")
    .select("id")
    .eq("anon_id", anonId)
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId: string | null = null;

  if (existing?.id) {
    // Reuse active session — update last_seen_at and meta
    const updateData: Record<string, unknown> = { last_seen_at: now };
    if (userId) updateData.user_id = userId;
    if (meta?.action) updateData.last_action = meta.action;
    if (meta?.businessType) updateData.business_type = meta.businessType;
    if (meta?.businessName) updateData.business_name = meta.businessName;
    if (meta?.location) updateData.location = meta.location;

    await db.from("sessions").update(updateData).eq("id", existing.id);
    sessionId = existing.id;
  } else {
    // No active session — create a new visit
    const insertData: Record<string, unknown> = {
      anon_id: anonId,
      last_seen_at: now,
    };
    if (userId) insertData.user_id = userId;
    if (meta?.locale) insertData.locale = meta.locale;
    if (meta?.userAgent) insertData.user_agent = meta.userAgent;
    if (meta?.action) insertData.last_action = meta.action;
    if (meta?.referrer) insertData.referrer = meta.referrer;
    if (meta?.ipHash) insertData.ip_hash = meta.ipHash;
    if (meta?.businessType) insertData.business_type = meta.businessType;
    if (meta?.businessName) insertData.business_name = meta.businessName;
    if (meta?.location) insertData.location = meta.location;

    const { data, error } = await db
      .from("sessions")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Session insert error:", error.message);
      return null;
    }
    sessionId = data?.id ?? null;
  }

  if (!sessionId) return null;

  const action = meta?.action;
  const counterMap: Record<string, string> = {
    campaign: "campaigns_count",
    segment: "segments_count",
    chat: "chats_count",
    format_post: "format_posts_count",
    imagine: "imagine_count",
  };
  const col = counterMap[action ?? ""];
  if (col) {
    await db.rpc("increment_counter", { p_id: sessionId, p_col: col }).then(() => {}, () => {});
  }

  return sessionId;
}

// ─── CAMPAIGN HELPERS ─────────────────────────────────────────────

export interface CampaignRecord {
  session_id: string | null;
  business_type?: string;
  business_name?: string;
  goal?: string;
  budget?: string;
  channels?: string[];
  result: object;
  name?: string;
}

export async function saveCampaign(record: CampaignRecord): Promise<string | null> {
  const db = getClient();
  if (!db) return null;

  const { data, error } = await db
    .from("campaigns")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    console.error("Save campaign error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// ─── SEGMENT HELPERS ──────────────────────────────────────────────

export interface SegmentRecord {
  session_id: string | null;
  mode: string;
  result: object;
  meta_label?: string;
  name?: string;
}

export async function saveSegment(record: SegmentRecord): Promise<string | null> {
  const db = getClient();
  if (!db) return null;

  const { data, error } = await db
    .from("segments")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    console.error("Save segment error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// ─── CHAT HELPERS ────────────────────────────────────────────────

export interface ChatRecord {
  session_id: string | null;
  user_message: string;
  assistant_message?: string;
  locale?: string;
}

export async function saveChat(record: ChatRecord): Promise<string | null> {
  const db = getClient();
  if (!db) return null;

  const { data, error } = await db
    .from("chats")
    .insert(record)
    .select("id")
    .single();

  if (error) {
    console.error("Save chat error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// ─── HISTORY HELPERS ──────────────────────────────────────────────

export async function getHistory(anonId: string) {
  const db = getClient();
  if (!db || !anonId || anonId === "unknown") return { campaigns: [], segments: [] };

  const { data: sessions } = await db
    .from("sessions")
    .select("id")
    .eq("anon_id", anonId);

  if (!sessions || sessions.length === 0) return { campaigns: [], segments: [] };

  const sessionIds = sessions.map((s) => s.id);

  const [{ data: campaigns }, { data: segments }] = await Promise.all([
    db
      .from("campaigns")
      .select("id, name, business_type, business_name, goal, created_at, result")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("segments")
      .select("id, name, mode, meta_label, created_at, result")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return { campaigns: campaigns ?? [], segments: segments ?? [] };
}

// ─── HISTORY BY USER ─────────────────────────────────────────────────

export async function getHistoryByUserId(userId: string) {
  const db = getClient();
  if (!db || !userId) return { campaigns: [], segments: [] };

  const { data: sessions } = await db
    .from("sessions")
    .select("id")
    .eq("user_id", userId);

  if (!sessions || sessions.length === 0) return { campaigns: [], segments: [] };

  const sessionIds = sessions.map((s) => s.id);

  const [{ data: campaigns }, { data: segments }] = await Promise.all([
    db
      .from("campaigns")
      .select("id, name, business_type, business_name, goal, created_at, result")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("segments")
      .select("id, name, mode, meta_label, created_at, result")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return { campaigns: campaigns ?? [], segments: segments ?? [] };
}

// ─── HEALTH CHECK (for /api/health) ─────────────────────────────────

export async function checkSupabaseConnection(): Promise<{
  ok: boolean;
  error?: string;
  sessionsCount?: number;
}> {
  const db = getClient();
  if (!db) return { ok: false, error: "Supabase not configured" };

  const { count, error } = await db.from("sessions").select("id", { count: "exact", head: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, sessionsCount: count ?? 0 };
}
