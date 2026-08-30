import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/account/export — everything the platform holds for the signed-in user:
// their profile row (public.users), their sessions (sessions.user_id = user.id),
// every campaign, segment and chat linked to those sessions, and every review
// they authored. Keep this list in step with the delete route below it.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getServiceClient();
    if (!db) return Response.json({ error: "Service unavailable" }, { status: 503 });

    const { data: profile, error: profileError } = await db
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Export profile fetch error:", profileError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    const { data: sessions, error: sessionsError } = await db
      .from("sessions")
      .select("*")
      .eq("user_id", user.id);

    if (sessionsError) {
      console.error("Export sessions fetch error:", sessionsError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);

    let campaigns: unknown[] = [];
    let segments: unknown[] = [];
    let chats: unknown[] = [];

    if (sessionIds.length > 0) {
      const [
        { data: campaignRows, error: campaignsError },
        { data: segmentRows, error: segmentsError },
        { data: chatRows, error: chatsError },
      ] = await Promise.all([
        db.from("campaigns").select("*").in("session_id", sessionIds),
        db.from("segments").select("*").in("session_id", sessionIds),
        db.from("chats").select("*").in("session_id", sessionIds),
      ]);

      if (campaignsError) {
        console.error("Export campaigns fetch error:", campaignsError.message);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
      }
      if (segmentsError) {
        console.error("Export segments fetch error:", segmentsError.message);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
      }
      if (chatsError) {
        console.error("Export chats fetch error:", chatsError.message);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
      }

      campaigns = campaignRows ?? [];
      segments = segmentRows ?? [];
      chats = chatRows ?? [];
    }

    // Reviews are keyed to the author, not to a session, so they are fetched separately.
    const { data: reviewRows, error: reviewsError } = await db
      .from("reviews")
      .select("*")
      .eq("user_id", user.id);

    if (reviewsError) {
      console.error("Export reviews fetch error:", reviewsError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    const payload = {
      exportedFor: user.email,
      profile: profile ?? null,
      sessions: sessions ?? [],
      campaigns,
      segments,
      chats,
      reviews: reviewRows ?? [],
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="ai4smb-my-data.json"',
      },
    });
  } catch (err) {
    console.error("Account export error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
