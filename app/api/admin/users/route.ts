import { createClient } from "@supabase/supabase-js";
import { getUser } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const user = await getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  if (!db) return Response.json({ error: "DB unavailable" }, { status: 503 });

  const { data: sessions, error: sessErr } = await db
    .from("sessions")
    .select("id, anon_id, user_id, business_type, business_name, location, locale, actions_count, campaigns_count, segments_count, chats_count, last_action, ip_hash, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false })
    .limit(200);

  if (sessErr) {
    return Response.json({ error: sessErr.message }, { status: 500 });
  }

  const userIds = (sessions ?? []).map((s) => s.user_id).filter(Boolean);
  let usersMap: Record<string, { email: string; full_name: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await db
      .from("users")
      .select("id, email, full_name")
      .in("id", userIds);
    if (users) {
      usersMap = Object.fromEntries(users.map((u) => [u.id, { email: u.email, full_name: u.full_name }]));
    }
  }

  const sessionIds = (sessions ?? []).map((s) => s.id);
  let reviewsMap: Record<string, { rating: number; nps_score: number | null; text: string; display_name: string; created_at: string }> = {};
  if (sessionIds.length > 0) {
    const { data: reviews } = await db
      .from("reviews")
      .select("session_id, rating, nps_score, text, display_name, created_at")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });
    if (reviews) {
      for (const r of reviews) {
        if (!reviewsMap[r.session_id]) {
          reviewsMap[r.session_id] = r;
        }
      }
    }
  }

  const rows = (sessions ?? []).map((s) => {
    const u = s.user_id ? usersMap[s.user_id] : null;
    const r = reviewsMap[s.id];
    return {
      sessionId: s.id,
      anonId: s.anon_id,
      userType: s.user_id ? "authenticated" : "anonymous",
      email: u?.email || null,
      fullName: u?.full_name || null,
      businessType: s.business_type || null,
      businessName: s.business_name || null,
      location: s.location || null,
      locale: s.locale || "en",
      actionsCount: s.actions_count || 0,
      campaignsCount: s.campaigns_count || 0,
      segmentsCount: s.segments_count || 0,
      chatsCount: s.chats_count || 0,
      lastAction: s.last_action || null,
      firstSeen: s.created_at,
      lastSeen: s.last_seen_at,
      reviewRating: r?.rating ?? null,
      reviewNps: r?.nps_score ?? null,
      reviewText: r?.text || null,
      reviewName: r?.display_name || null,
      reviewDate: r?.created_at || null,
    };
  });

  // Fetch all reviews with full details
  const { data: allReviews } = await db
    .from("reviews")
    .select("id, session_id, user_id, rating, nps_score, text, business_type, location, display_name, email, is_anonymous, consent_display, consent_contact, tools_used, campaigns_count, segments_count, approved, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const reviewRows = (allReviews ?? []).map((r) => {
    const sess = (sessions ?? []).find((s) => s.id === r.session_id);
    const u = r.user_id ? usersMap[r.user_id] : null;
    return {
      reviewId: r.id,
      rating: r.rating,
      npsScore: r.nps_score,
      text: r.text,
      businessType: r.business_type || sess?.business_type || null,
      businessName: sess?.business_name || null,
      location: r.location || sess?.location || null,
      locale: sess?.locale || "en",
      displayName: r.display_name || null,
      email: r.email || u?.email || null,
      fullName: u?.full_name || null,
      isAnonymous: r.is_anonymous,
      consentDisplay: r.consent_display,
      consentContact: r.consent_contact,
      toolsUsed: r.tools_used || [],
      campaignsCount: r.campaigns_count || 0,
      segmentsCount: r.segments_count || 0,
      approved: r.approved,
      reviewDate: r.created_at,
      sessionCampaigns: sess?.campaigns_count || 0,
      sessionSegments: sess?.segments_count || 0,
      sessionChats: sess?.chats_count || 0,
      userType: sess?.user_id ? "authenticated" : "anonymous",
    };
  });

  return Response.json({ users: rows, reviews: reviewRows, total: rows.length });
}
