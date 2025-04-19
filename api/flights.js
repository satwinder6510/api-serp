export default async function handler(req, res) {
  const { query } = req;
  const serpapi_key = process.env.SERPAPI_KEY;

  if (!serpapi_key) {
    return res.status(500).json({ error: "Missing SERPAPI_KEY in environment." });
  }

  const params = new URLSearchParams({
    ...query,
    engine: 'google_flights',
    api_key: serpapi_key,
  });

  try {
    const apiRes = await fetch(`https://serpapi.com/search?${params.toString()}`);
    const data = await apiRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from SerpApi", details: err.message });
  }
}
