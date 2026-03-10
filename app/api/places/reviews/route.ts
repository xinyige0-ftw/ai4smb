const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return Response.json({ error: "Missing placeId" }, { status: 400 });
  }

  if (!PLACES_KEY) {
    return Response.json({ error: "Places API not configured" }, { status: 500 });
  }

  try {
    const fields = "name,formatted_address,rating,user_ratings_total,reviews";
    const baseUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${PLACES_KEY}`;

    const [relevantRes, newestRes] = await Promise.all([
      fetch(`${baseUrl}&reviews_sort=most_relevant`),
      fetch(`${baseUrl}&reviews_sort=newest`),
    ]);

    const relevantData = await relevantRes.json();
    const newestData = await newestRes.json();

    if (relevantData.status !== "OK" && newestData.status !== "OK") {
      return Response.json({ error: relevantData.error_message || "Failed to fetch reviews" }, { status: 500 });
    }

    const place = relevantData.result || newestData.result;

    const seen = new Set<string>();
    const allReviews: Record<string, unknown>[] = [];
    for (const r of [...(relevantData.result?.reviews || []), ...(newestData.result?.reviews || [])]) {
      const key = `${r.author_name}:${r.time}`;
      if (!seen.has(key)) {
        seen.add(key);
        allReviews.push(r);
      }
    }

    const reviews = allReviews.map((r) => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.relative_time_description,
    }));

    return Response.json({
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      reviews,
    });
  } catch {
    return Response.json({ error: "Failed to fetch place details" }, { status: 500 });
  }
}
