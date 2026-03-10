const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return Response.json({ error: "Query too short" }, { status: 400 });
  }

  if (!PLACES_KEY) {
    return Response.json({ error: "Places API not configured" }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=establishment&key=${PLACES_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return Response.json({ error: data.error_message || "Places search failed" }, { status: 500 });
    }

    const results = (data.results || []).slice(0, 5).map((p: Record<string, unknown>) => ({
      placeId: p.place_id,
      name: p.name,
      address: p.formatted_address,
      rating: p.rating,
      totalRatings: p.user_ratings_total,
    }));

    return Response.json({ results });
  } catch {
    return Response.json({ error: "Failed to search places" }, { status: 500 });
  }
}
