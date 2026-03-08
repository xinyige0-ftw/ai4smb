import { getUser } from "@/lib/auth";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const anonId = searchParams.get("anonId") || "";

    const db = getServiceClient();
    if (!db) return Response.json({ error: "Service unavailable" }, { status: 503 });

    const { data: sessions } = await db
      .from("sessions")
      .select("id, preferences")
      .eq("user_id", user.id);

    const sessionIds = (sessions || []).map((s) => s.id);
    const preferences = sessions?.[0]?.preferences ?? {};

    let totalCampaigns = 0;
    let totalSegments = 0;

    if (sessionIds.length > 0) {
      const [{ count: campCount }, { count: segCount }] = await Promise.all([
        db.from("campaigns").select("id", { count: "exact", head: true }).in("session_id", sessionIds),
        db.from("segments").select("id", { count: "exact", head: true }).in("session_id", sessionIds),
      ]);
      totalCampaigns = campCount ?? 0;
      totalSegments = segCount ?? 0;
    }

    const rateLimit = anonId ? getRateLimitStatus(anonId) : { used: 0, limit: 10, resetsAt: null };

    return Response.json({
      email: user.email,
      provider: user.app_metadata?.provider || "email",
      createdAt: user.created_at,
      totalCampaigns,
      totalSegments,
      rateLimit,
      preferences,
    });
  } catch (err) {
    console.error("Profile error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const preferences = body.preferences;
    if (!preferences || typeof preferences !== "object") {
      return Response.json({ error: "Invalid preferences" }, { status: 400 });
    }

    const db = getServiceClient();
    if (!db) return Response.json({ error: "Service unavailable" }, { status: 503 });

    const { data, error } = await db
      .from("sessions")
      .update({ preferences })
      .eq("user_id", user.id)
      .select("preferences")
      .single();

    if (error) {
      console.error("Preferences update error:", error);
      return Response.json({ error: "Update failed" }, { status: 500 });
    }

    return Response.json({ preferences: data.preferences });
  } catch (err) {
    console.error("PATCH profile error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
