# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Development server at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm test                 # Run Jest test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
npm run db:reset         # Reset database (drops all tables and recreates schema)
```

## Architecture

**Mayday** is a Next.js application that scans local businesses via Google Places API, checks their websites for issues, and surfaces leads for web development services.

### Core Concept

The app identifies three types of leads:
- **fix** - "Your site is broken, I can help" (4xx/5xx errors, SSL issues, expired hosting, parked domains)
- **build** - "You don't have a website, I can build one" (no website listed)
- **social_only** - "Facebook isn't enough, let me build you a real site" (website redirects to social media)

### Tech Stack

- **Frontend**: Next.js 14 with App Router, React 18, Tailwind CSS
- **Database**: Neon PostgreSQL with `@neondatabase/serverless`
- **Authentication**: NextAuth.js with credentials provider
- **External APIs**: Google Places API (Text Search + Place Details)

### Project Structure

**API Routes** (`/app/api`):
- `/api/init` - Initialize database schema
- `/api/scan` - Run business scans (new scan or rescan)
- `/api/leads` - Fetch leads with filtering
- `/api/export` - Export leads to CSV
- `/api/stats` - Dashboard statistics

**Core Libraries** (`/lib`):
- `website-checker.ts` - Website health detection and lead classification
- `scanner.ts` - Business scanning orchestration and progress tracking
- `google-places.ts` - Google Places API client
- `db.ts` - Database operations (Neon PostgreSQL)

**Pages** (`/app`):
- `page.tsx` - Dashboard UI

**Tests** (`/lib/__tests__`):
- `website-checker.test.ts` - Tests for website status detection and scan scheduling
- `scanner.test.ts` - Tests for scanner orchestration

## Configuration

**Environment Variables** (`.env`):
```bash
DATABASE_URL=postgresql://...          # Neon PostgreSQL connection string
GOOGLE_PLACES_API_KEY=...             # Google Places API key
NEXTAUTH_URL=http://localhost:3000    # NextAuth URL (use production URL in deployment)
NEXTAUTH_SECRET=...                   # NextAuth secret (generate with: openssl rand -base64 32)
AUTH_USERNAME=admin                   # Login username
AUTH_PASSWORD=...                     # Login password
```

**Location Config** (`config.json`):
```json
{
  "center": { "lat": 29.7604, "lng": -95.3698, "label": "Houston" },
  "radius_miles": 10,
  "monthly_budget_usd": 200
}
```

## Website Status Types

The website checker can detect the following statuses:

**Working Sites**:
- `up` - Site is working properly

**Lead-Generating Issues**:
- `http_4xx` - Client error (404, 403, etc.)
- `http_5xx` - Server error (500, 502, etc.)
- `timeout` - Request timed out
- `ssl_expired` - SSL certificate expired
- `ssl_invalid` - SSL certificate invalid
- `connection_refused` - Connection refused
- `dns_failure` - Domain not found
- `hosting_expired` - Hosting/subscription expired (Squarespace, Wix, Weebly, GoDaddy)
- `parked` - Domain is parked (GoDaddy, Namecheap, generic)
- `redirect_social` - Website redirects to social media (Facebook, Instagram, Twitter)
- `no_website` - No website URL listed

## Scan Scheduling Logic

The app automatically schedules rescans based on website status:

- **Working sites** (`up`): Weekly (7 days)
- **No website/Social only** (`no_website`, `redirect_social`): Monthly (30 days)
- **Down sites**: Adaptive based on downtime duration
  - < 7 days down: Weekly (7 days)
  - 7-30 days down: Bi-weekly (14 days)
  - 30+ days down: Monthly (30 days)

## Platform Detection

The website checker can detect expired/parked domains from:
- Squarespace (expired subscription)
- GoDaddy (parked or expired)
- Wix (unpublished sites)
- Weebly (unavailable sites)
- Namecheap (parked domains)
- Generic parked/suspended pages

## Testing

**Test Framework**: Jest with TypeScript support

**Test Files**:
- `website-checker.test.ts` - 22 tests covering status detection, lead classification, and scan scheduling
- `scanner.test.ts` - 2 tests covering scanner orchestration and database integration

**Running Tests**:
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

**Test Coverage**:
- Website status detection for all error types
- Lead type classification (fix, build, social_only)
- Scan scheduling logic
- Social link extraction
- Platform detection (GoDaddy, Squarespace, etc.)
- Error handling (network errors, SSL issues, DNS failures)

**CI/CD**:
- GitHub Actions workflow runs on push/PR to main
- Automated checks: lint, test, build
- Workflow file: `.github/workflows/ci.yml`
- Uses Node.js 20.x with npm caching

## Database Schema

**Tables**:
- `businesses` - Business information from Google Places
- `scan_results` - Website check results with lead classification
- `scan_runs` - Scan execution metadata

**Key Fields**:
- `status` - Website status (up, http_5xx, parked, etc.)
- `lead_type` - Lead classification (fix, build, social_only, null)
- `first_detected_down` - Timestamp when site first went down (used for adaptive rescanning)
- `next_scan_date` - Scheduled next scan date
- `social_links` - JSON object with extracted social media links

## Google Places API

**Cost Structure**:
- Text Search: $32/1k requests
- Place Details: $17/1k requests
- Free tier: ~$200/month → 10-15k businesses/month capacity

**Rate Limiting**:
- 1 second delay between website checks
- 2 second delay between paginated search results

## Authentication

The app is protected by NextAuth.js to prevent unauthorized API usage:

**Login Page**: `/login`
- Simple credentials-based authentication
- Username and password stored in environment variables
- Session managed with JWT strategy

**Protected Routes**:
- Dashboard (`/`)
- All API routes (`/api/scan`, `/api/leads`, `/api/export`, `/api/stats`, `/api/config`)

**Setup**:
1. Generate a secure NEXTAUTH_SECRET: `openssl rand -base64 32`
2. Set `AUTH_USERNAME` and `AUTH_PASSWORD` in `.env`
3. Set `NEXTAUTH_URL` to your deployment URL (e.g., `https://your-app.vercel.app`)

**Access**: Users must log in to access the dashboard and API endpoints.

## Git Workflow

- Never rebase commits that have been pushed to remote — only rebase local, unpushed commits
- When reconciling divergent branches, prefer rebase for unpushed local work, merge otherwise

## Deployment

**Vercel Deployment**:
1. Create Neon database at [neon.tech](https://neon.tech)
2. Push to GitHub and import in Vercel
3. Add environment variables:
   - `DATABASE_URL`
   - `GOOGLE_PLACES_API_KEY`
   - `NEXTAUTH_URL` (your Vercel app URL)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `AUTH_USERNAME`
   - `AUTH_PASSWORD`
4. After deploying, initialize database: `curl -X POST https://your-app.vercel.app/api/init`

**Local Development**:
```bash
npm install
cp .env.example .env
# Add your credentials to .env
npm run dev
```
