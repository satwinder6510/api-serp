export default async function handler(req, res) {
  const { query } = req;
  const serpapi_key = process.env.SERPAPI_KEY;

  if (!serpapi_key) {
    return res.status(500).json({ error: "Missing SERPAPI_KEY in environment." });
  }

  // ✅ Decode multi_city_json safely
  if (query.multi_city_json) {
    try {
      const raw = query.multi_city_json;
      const decoded = decodeURIComponent(raw);
      console.log("🧪 Raw:", raw);
      console.log("✅ Decoded:", decoded);

      // Try parsing to ensure it's valid JSON
      const parsed = JSON.parse(decoded);
      console.log("📦 Parsed multi_city_json:", parsed);

      query.multi_city_json = decoded;
    } catch (err) {
      console.error("❌ Failed to decode/parse multi_city_json:", err.message);
      return res.status(400).json({ error: "Invalid multi_city_json encoding" });
    }
  }

  const params = new URLSearchParams({
    ...query,
    engine: "google_flights",
    api_key: serpapi_key,
  });

  try {
    const apiRes = await fetch(`https://serpapi.com/search?${params.toString()}`);
    const data = await apiRes.json();

    console.log("✅ SerpApi response received");
    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error fetching from SerpApi:", err.message);
    res.status(500).json({ error: "Failed to fetch from SerpApi", details: err.message });
  }
}
