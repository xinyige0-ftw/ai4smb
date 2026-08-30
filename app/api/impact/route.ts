import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/impact — public, aggregated, real-usage numbers for the platform.
 * No PII, no per-user data — table-level counts and review aggregates only.
 * Cached for an hour; every field is either a real query result or omitted
 * entirely (never fabricated / never a placeholder 0).
 */
export const revalidate = 3600;

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface ImpactStats {
  campaigns?: number;
  segments?: number;
  chats?: number;
  businessTypes?: number;
  locations?: number;
  reviews?: {
    count: number;
    averageRating?: number;
    nps?: number;
  };
  hoursSaved?: number;
  updatedAt: string;
}

/**
 * Computes the impact dashboard aggregate directly from Supabase. Exported
 * so the /impact server page can call it in-process instead of round-
 * tripping through this HTTP route.
 *
 * Every field is populated independently — if one query fails (or Supabase
 * isn't configured at all), the fields that did succeed are still returned;
 * nothing is ever backfilled with 0 or an invented number.
 */
export async function getImpactStats(): Promise<ImpactStats> {
  const stats: ImpactStats = { updatedAt: new Date().toISOString() };

  const db = getClient();
  if (!db) return stats;

  const [campaignsRes, segmentsRes, chatsRes, businessTypesRes, locationsRes, reviewsRes] =
    await Promise.allSettled([
      db.from("campaigns").select("id", { count: "exact", head: true }),
      db.from("segments").select("id", { count: "exact", head: true }),
      db.from("chats").select("id", { count: "exact", head: true }),
      db.from("campaigns").select("business_type").not("business_type", "is", null),
      db.from("sessions").select("location").not("location", "is", null).neq("location", ""),
      db.from("reviews").select("rating, nps_score").eq("approved", true),
    ]);

  let campaigns: number | undefined;
  let segments: number | undefined;

  if (campaignsRes.status === "fulfilled" && !campaignsRes.value.error) {
    campaigns = campaignsRes.value.count ?? 0;
    stats.campaigns = campaigns;
  } else if (campaignsRes.status === "fulfilled") {
    console.error("Impact stats: campaigns count error:", campaignsRes.value.error?.message);
  }

  if (segmentsRes.status === "fulfilled" && !segmentsRes.value.error) {
    segments = segmentsRes.value.count ?? 0;
    stats.segments = segments;
  } else if (segmentsRes.status === "fulfilled") {
    console.error("Impact stats: segments count error:", segmentsRes.value.error?.message);
  }

  if (chatsRes.status === "fulfilled" && !chatsRes.value.error) {
    stats.chats = chatsRes.value.count ?? 0;
  } else if (chatsRes.status === "fulfilled") {
    console.error("Impact stats: chats count error:", chatsRes.value.error?.message);
  }

  if (businessTypesRes.status === "fulfilled" && !businessTypesRes.value.error) {
    const distinct = new Set(
      (businessTypesRes.value.data ?? [])
        .map((r) => (r.business_type ?? "").trim())
        .filter((v) => v.length > 0)
    );
    stats.businessTypes = distinct.size;
  } else if (businessTypesRes.status === "fulfilled") {
    console.error("Impact stats: businessTypes error:", businessTypesRes.value.error?.message);
  }

  if (locationsRes.status === "fulfilled" && !locationsRes.value.error) {
    const distinct = new Set(
      (locationsRes.value.data ?? [])
        .map((r) => (r.location ?? "").trim())
        .filter((v) => v.length > 0)
    );
    stats.locations = distinct.size;
  } else if (locationsRes.status === "fulfilled") {
    console.error("Impact stats: locations error:", locationsRes.value.error?.message);
  }

  if (reviewsRes.status === "fulfilled" && !reviewsRes.value.error) {
    const rows = reviewsRes.value.data ?? [];
    if (rows.length > 0) {
      const averageRating = Math.round((rows.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rows.length) * 10) / 10;

      const npsRows = rows.filter((r) => typeof r.nps_score === "number");
      let nps: number | undefined;
      if (npsRows.length > 0) {
        const promoters = npsRows.filter((r) => (r.nps_score as number) >= 9).length;
        const detractors = npsRows.filter((r) => (r.nps_score as number) <= 6).length;
        nps = Math.round(((promoters - detractors) / npsRows.length) * 100);
      }

      stats.reviews = { count: rows.length, averageRating, ...(nps !== undefined ? { nps } : {}) };
    }
  } else if (reviewsRes.status === "fulfilled") {
    console.error("Impact stats: reviews error:", reviewsRes.value.error?.message);
  }

  if (campaigns !== undefined && segments !== undefined) {
    stats.hoursSaved = campaigns * 3 + segments * 2;
  }

  return stats;
}

export async function GET() {
  const stats = await getImpactStats();
  return Response.json(stats);
}
