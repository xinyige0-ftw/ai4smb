import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const db = getServiceClient();
  if (!db) return Response.json({ reviews: [] });

  const { data, error } = await db
    .from("reviews")
    .select("id, rating, nps_score, text, business_type, location, display_name, is_anonymous, tools_used, campaigns_count, segments_count, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Fetch reviews error:", error.message);
    return Response.json({ reviews: [] });
  }

  const safe = (data ?? []).map((r) => ({
    ...r,
    display_name: r.is_anonymous ? "" : r.display_name,
  }));

  return Response.json({ reviews: safe });
}

export async function POST(req: Request) {
  const db = getServiceClient();
  if (!db) {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const {
      rating, npsScore, text, businessType, location, displayName, email,
      isAnonymous, consentDisplay, consentContact,
      toolsUsed, campaignsCount, segmentsCount, anonId,
    } = body as {
      rating?: number;
      npsScore?: number | null;
      text?: string;
      businessType?: string;
      location?: string;
      displayName?: string;
      email?: string;
      isAnonymous?: boolean;
      consentDisplay?: boolean;
      consentContact?: boolean;
      toolsUsed?: string[];
      campaignsCount?: number;
      segmentsCount?: number;
      anonId?: string;
    };

    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    let userId: string | undefined;
    try {
      const user = await getUser();
      if (user) userId = user.id;
    } catch {}

    let sessionId: string | null = null;
    if (anonId && anonId !== "unknown") {
      const { data: session } = await db
        .from("sessions")
        .select("id")
        .eq("anon_id", anonId)
        .single();
      sessionId = session?.id ?? null;
    }

    const anonymous = isAnonymous !== false;

    const validNps = typeof npsScore === "number" && npsScore >= 0 && npsScore <= 10 ? npsScore : null;

    const { data, error } = await db
      .from("reviews")
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        rating,
        nps_score: validNps,
        text: text || "",
        business_type: businessType || "",
        location: (location || "").slice(0, 200),
        display_name: (displayName || "").slice(0, 100),
        email: (email || "").slice(0, 200),
        is_anonymous: anonymous,
        consent_display: consentDisplay ?? false,
        consent_contact: consentContact ?? false,
        tools_used: toolsUsed || [],
        campaigns_count: campaignsCount ?? 0,
        segments_count: segmentsCount ?? 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Save review error:", error.message);
      return Response.json({ error: "Failed to save review" }, { status: 500 });
    }

    return Response.json({ id: data?.id, message: "Review submitted! It will appear after approval." });
  } catch (err) {
    console.error("Review error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
