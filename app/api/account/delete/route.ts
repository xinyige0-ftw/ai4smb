import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST /api/account/delete — permanently deletes everything the platform
// holds for the signed-in user: their campaigns, segments, chats, reviews,
// sessions and profile row (public.users). Does NOT delete the Supabase auth
// user itself.
//
// Order matters. Every table that references a session must be cleared before
// the sessions themselves, or a foreign key can reject the session delete and
// abort the whole request.
//
// Every query below is scoped either to session ids that were just looked
// up for this specific user.id, or directly to user.id — it can never
// match another user's rows, and there is no unscoped fallback.
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: { confirm?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body?.confirm !== "DELETE") {
      return Response.json({ error: 'Confirmation required: send { "confirm": "DELETE" }' }, { status: 400 });
    }

    const db = getServiceClient();
    if (!db) return Response.json({ error: "Service unavailable" }, { status: 503 });

    const { data: sessions, error: sessionsError } = await db
      .from("sessions")
      .select("id")
      .eq("user_id", user.id);

    if (sessionsError) {
      console.error("Delete sessions lookup error:", sessionsError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    const sessionIds = (sessions ?? []).map((s) => s.id);

    let campaignsDeleted = 0;
    let segmentsDeleted = 0;
    let chatsDeleted = 0;

    if (sessionIds.length > 0) {
      const { data: deletedCampaigns, error: campaignsError } = await db
        .from("campaigns")
        .delete()
        .in("session_id", sessionIds)
        .select("id");

      if (campaignsError) {
        console.error("Delete campaigns error:", campaignsError.message);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
      }
      campaignsDeleted = deletedCampaigns?.length ?? 0;

      const { data: deletedSegments, error: segmentsError } = await db
        .from("segments")
        .delete()
        .in("session_id", sessionIds)
        .select("id");

      if (segmentsError) {
        console.error("Delete segments error:", segmentsError.message);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
      }
      segmentsDeleted = deletedSegments?.length ?? 0;

      const { data: deletedChats, error: chatsError } = await db
        .from("chats")
        .delete()
        .in("session_id", sessionIds)
        .select("id");

      if (chatsError) {
        console.error("Delete chats error:", chatsError.message);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
      }
      chatsDeleted = deletedChats?.length ?? 0;
    }

    // Reviews are keyed to the author and may also reference a session, so they
    // are removed before the sessions are.
    const { data: deletedReviews, error: reviewsError } = await db
      .from("reviews")
      .delete()
      .eq("user_id", user.id)
      .select("id");

    if (reviewsError) {
      console.error("Delete reviews error:", reviewsError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
    const reviewsDeleted = deletedReviews?.length ?? 0;

    const { data: deletedSessions, error: deleteSessionsError } = await db
      .from("sessions")
      .delete()
      .eq("user_id", user.id)
      .select("id");

    if (deleteSessionsError) {
      console.error("Delete sessions error:", deleteSessionsError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
    const sessionsDeleted = deletedSessions?.length ?? 0;

    const { error: deleteProfileError } = await db
      .from("users")
      .delete()
      .eq("id", user.id);

    if (deleteProfileError) {
      console.error("Delete profile error:", deleteProfileError.message);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

    return Response.json({
      deleted: {
        campaigns: campaignsDeleted,
        segments: segmentsDeleted,
        chats: chatsDeleted,
        reviews: reviewsDeleted,
        sessions: sessionsDeleted,
      },
    });
  } catch (err) {
    console.error("Account delete error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
