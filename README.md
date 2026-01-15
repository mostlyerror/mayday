# 🚨 Mayday - Broken Website Lead Finder

A Next.js application that scans local businesses via Google Places API, checks their websites for issues, and surfaces leads for web development services.

## Deploy to Vercel

### 1. Create Neon Database (free)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy your connection string (looks like `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`)

### 2. Deploy to Vercel

Push to GitHub, then import in Vercel. Add these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `GOOGLE_PLACES_API_KEY` | Your Google Places API key |

### 3. Initialize Database

After deploying, run:
```bash
curl -X POST https://your-app.vercel.app/api/init
```

Done! 🚀

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Add your credentials to .env.local
npm run dev
```

## Configuration

Edit `config.json` for your location:

```json
{
  "center": { "lat": 29.7604, "lng": -95.3698, "label": "Houston" },
  "radius_miles": 10,
  "monthly_budget_usd": 200
}
```

## Lead Types

| Lead Type | Pitch |
|-----------|-------|
| `fix` | "Your site is broken, I can help" |
| `build` | "You don't have a website, I can build one" |
| `social_only` | "Facebook isn't enough, let me build you a real site" |

## Status Codes

`up` · `http_4xx` · `http_5xx` · `timeout` · `ssl_expired` · `ssl_invalid` · `connection_refused` · `dns_failure` · `hosting_expired` · `parked` · `redirect_social` · `no_website`

## API Costs

Google Places API (~$200/month free tier):
- Text Search: $32/1k requests
- Place Details: $17/1k requests

Capacity: ~10-15k businesses/month free
