# Final Vercel Proxy for SerpApi (CORS-free)

## 🚀 How to Deploy

1. Push these contents to a GitHub repo
2. Import the repo to [Vercel](https://vercel.com/import)
3. In Vercel:
   - Go to Settings → Environment Variables
   - Add `SERPAPI_KEY` = your actual key
4. Deploy and test:

```
https://<your-project>.vercel.app/api/flights?departure_id=LGW&arrival_id=VIE&outbound_date=2025-05-01&type=2
```
