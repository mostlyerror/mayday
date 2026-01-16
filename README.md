# Mayday

> **Intelligent lead generation for web development services**
> Automatically discovers local businesses with broken, missing, or inadequate websites.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql)

## Overview

**Mayday** is a full-stack web application that automates the discovery of web development leads by scanning local businesses and analyzing their online presence. It identifies opportunities by detecting broken websites, missing sites, and businesses relying solely on social media.

Built as a practical solution to streamline client acquisition for web developers and agencies, Mayday combines Google Places API data with intelligent website health checks to surface high-value leads automatically.

---

## Problem & Solution

### The Problem
Finding web development clients traditionally requires:
- Manual searching through business directories
- Time-consuming website checks
- Inconsistent lead qualification
- No systematic tracking of opportunities

### The Solution
Mayday automates the entire lead generation pipeline:
1. **Discover** businesses in any location using Google Places API
2. **Analyze** each business's website for issues (SSL errors, timeouts, parked domains, etc.)
3. **Classify** leads into actionable categories (Fix, Build, Social Only)
4. **Track** opportunities with adaptive rescanning based on site status
5. **Export** qualified leads ready for outreach

---

## Key Features

### 🎯 Intelligent Lead Classification
- **Fix Leads** - "Your site is broken, I can help"
  - HTTP 4xx/5xx errors, SSL issues, expired hosting, DNS failures, parked domains
- **Build Leads** - "You don't have a website, I can build one"
  - No website URL listed in Google Places
- **Social Only Leads** - "Facebook isn't enough, let me build you a real site"
  - Website redirects to social media (Facebook, Instagram, Twitter)

### 🔍 Comprehensive Website Health Detection
- HTTP status codes (4xx/5xx errors)
- SSL certificate validation (expired, invalid)
- Platform detection (Squarespace, Wix, GoDaddy, Weebly)
- Parked domain identification
- Social media redirect detection
- Connection and DNS failure handling
- Progressive timeout strategy (prevents false positives)

### 🔄 Adaptive Scan Scheduling
Smart rescanning based on website status:
- Working sites: Weekly (7 days)
- No website/Social only: Monthly (30 days)
- Down sites: Adaptive based on downtime duration
  - < 7 days down → Weekly
  - 7-30 days down → Bi-weekly
  - 30+ days down → Monthly

### 📊 Dashboard & Analytics
- Real-time scan progress tracking
- Lead filtering by type
- Statistics dashboard
- CSV export for outreach campaigns
- Scan history and results tracking

### 🔐 Secure Authentication
- NextAuth.js integration
- Protected API routes and dashboard
- JWT session management
- Environment-based credentials

---

## Technical Highlights

### Architecture & Design Decisions

**Next.js App Router** - Modern server-first architecture with React Server Components for optimal performance

**Parallel Processing** - Uses `Promise.all` and `Promise.allSettled` to scan multiple businesses concurrently while respecting API rate limits

**Progressive Timeout Strategy** - Implements escalating timeouts (5s → 10s → 15s) to avoid false positives on slow but working sites

**Adaptive Rescanning** - Intelligently schedules future scans based on website status and downtime duration to optimize API usage

**Database Design** - Normalized schema with separate tables for businesses, scan results, and scan runs to track historical data

**Cost Optimization** - Built-in budget calculator and rate limiting to stay within Google Places API free tier (~$200/month → 10-15k businesses)

### Technical Challenges Solved

1. **False Positive Prevention** - Slow sites were being marked as down; solved with progressive timeout strategy
2. **Rate Limiting** - Implemented intelligent delays between API calls to stay under Google's rate limits
3. **SSL Error Handling** - Proper detection of various SSL issues (expired, invalid, self-signed)
4. **Platform Detection** - Pattern matching for identifying expired/parked domains across multiple hosting providers
5. **Authentication** - Secured all routes and API endpoints to prevent unauthorized usage and API key exposure
6. **CI/CD** - Automated testing and deployment with GitHub Actions

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Neon PostgreSQL with `@neondatabase/serverless`
- **Authentication**: NextAuth.js (credentials provider, JWT strategy)
- **External APIs**: Google Places API (Text Search + Place Details)
- **Testing**: Jest with TypeScript support (22 tests, CI/CD with GitHub Actions)
- **Deployment**: Vercel (serverless, automatic preview deployments)

---

## Project Structure

```
mayday/
├── app/
│   ├── api/              # API routes (scan, leads, export, stats, init)
│   ├── login/            # Authentication UI
│   └── page.tsx          # Dashboard (main UI)
├── lib/
│   ├── website-checker.ts   # Website health detection & lead classification
│   ├── scanner.ts           # Scan orchestration & progress tracking
│   ├── google-places.ts     # Google Places API client
│   ├── db.ts                # Database operations (Neon PostgreSQL)
│   └── __tests__/           # Jest test suite
├── config.json           # Location & budget configuration
└── middleware.ts         # NextAuth route protection
```

---

## Testing & Quality Assurance

### Test Coverage
- **22 tests** covering core functionality
- Website status detection for all error types
- Lead classification logic (fix, build, social_only)
- Scan scheduling calculations
- Social link extraction
- Platform detection (GoDaddy, Squarespace, Wix, etc.)
- Error handling (network errors, SSL issues, DNS failures)

### CI/CD Pipeline
- GitHub Actions workflow runs on push/PR to main
- Automated checks: lint, test, build
- Ensures code quality before deployment

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

---

## Results & Impact

### What It Does Well
- **Automation**: Eliminates hours of manual research per week
- **Accuracy**: Progressive timeout strategy prevents false positives
- **Scalability**: Can scan 10-15k businesses/month within Google's free tier
- **Intelligence**: Adaptive rescanning optimizes API usage based on site patterns
- **Actionable**: Direct CSV export with business details ready for outreach

### Real-World Performance
- Detects 15+ types of website issues automatically
- Handles SSL errors, DNS failures, and platform-specific patterns
- Tracks scan history to identify trends (sites going down/up over time)
- Budget-aware: Built-in cost calculator for API usage

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Neon PostgreSQL database ([neon.tech](https://neon.tech))
- Google Places API key

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your credentials to .env
# DATABASE_URL, GOOGLE_PLACES_API_KEY, etc.

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
DATABASE_URL=postgresql://...          # Neon PostgreSQL connection string
GOOGLE_PLACES_API_KEY=...             # Google Places API key
NEXTAUTH_SECRET=...                   # Generate with: openssl rand -base64 32
AUTH_USERNAME=admin                   # Login username
AUTH_PASSWORD=...                     # Login password

# For local development only:
NEXTAUTH_URL=http://localhost:3000    # Not needed for Vercel deployments
```

## Deployment

### Vercel Deployment

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Push to GitHub and import your repository in Vercel
3. Add environment variables in Vercel:
   - `DATABASE_URL`
   - `GOOGLE_PLACES_API_KEY`
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `AUTH_USERNAME`
   - `AUTH_PASSWORD`

   **⚠️ Important**: Do NOT set `NEXTAUTH_URL` for Vercel deployments. Omitting this variable allows NextAuth to auto-detect the URL, which properly handles both production and preview deployments.

4. Make sure environment variables are enabled for **Preview** deployments (not just Production)
5. After deploying, initialize the database:
   ```bash
   curl -X POST https://your-app.vercel.app/api/init
   ```

## Authentication

The application uses NextAuth.js to protect all routes and API endpoints from unauthorized access.

### Protected Routes

- **Dashboard** (`/`) - Main application interface
- **All API endpoints** (`/api/*`) - Scan operations, lead management, exports, and stats

### Login

Access the application at your deployment URL and you'll be redirected to `/login`. Use the credentials you set in your environment variables:

- **Username**: Value of `AUTH_USERNAME`
- **Password**: Value of `AUTH_PASSWORD`

### Session Management

- Sessions use JWT (JSON Web Token) strategy
- Sessions persist across page refreshes
- Log out using the logout button in the dashboard

### Security Notes

- Change the default `AUTH_USERNAME` and `AUTH_PASSWORD` before deploying
- Keep `NEXTAUTH_SECRET` secure and never commit it to version control
- Use a strong password (consider using a password generator)
- For production, consider implementing more robust authentication (OAuth, email/password with hashing, etc.)

---

## Usage

### Configuration

Edit `config.json` to set your target location and budget:

```json
{
  "center": { "lat": 29.7604, "lng": -95.3698, "label": "Houston" },
  "radius_miles": 10,
  "monthly_budget_usd": 200
}
```

### Running Scans

1. Log in with your credentials (set in environment variables)
2. Click "Start Scan" to scan businesses in your configured area
3. View leads filtered by type (Fix, Build, Social Only)
4. Export leads to CSV for outreach

### Available Commands

```bash
npm run dev              # Development server at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm test                 # Run Jest test suite
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
npm run db:reset         # Reset database (drops all tables and recreates schema)
```

---

## Use Cases & Applications

This project demonstrates:

### For Web Developers & Agencies
- **Lead Generation**: Automated discovery of businesses needing web services
- **Market Research**: Analyze web presence quality in specific areas/industries
- **Competitive Analysis**: Track which businesses are upgrading or neglecting their sites

### Technical Skills Showcased
- **Full-Stack Development**: Next.js App Router, API routes, database integration
- **API Integration**: Working with external APIs (Google Places), rate limiting, cost optimization
- **Problem Solving**: Progressive timeout strategy, false positive prevention
- **Database Design**: PostgreSQL schema design with historical tracking
- **Testing**: Comprehensive test coverage with Jest
- **Authentication**: Secure route protection with NextAuth.js
- **DevOps**: CI/CD with GitHub Actions, Vercel deployment
- **TypeScript**: Strong typing throughout application

### Blog Post Ideas
- "Building a Lead Generation Tool with Next.js and Google Places API"
- "How I Prevented False Positives with Progressive Timeout Strategy"
- "Optimizing API Costs: Staying Within Google's Free Tier"
- "Adaptive Scan Scheduling: Smart Resource Management"
- "Full-Stack TypeScript: From Database to UI"

---

## Future Enhancements

Potential features for expansion:
- Email notifications for new leads
- Webhook integration for CRM systems
- Industry-specific scanning (restaurants, salons, contractors)
- Competitor monitoring (track when competitors' sites go down)
- Historical trend analysis and visualization
- AI-powered outreach message generation
- Multi-user support with team permissions
- API for integrating with other tools

---

## About This Project

**Mayday** was built as a practical solution to a real business need: finding web development clients efficiently. It combines modern web technologies with intelligent automation to create a tool that saves hours of manual work while providing better, more consistent results.

The codebase demonstrates production-ready practices including comprehensive testing, CI/CD, secure authentication, and thoughtful architecture decisions. It's designed to be maintainable, scalable, and cost-effective.

**Built with**: Next.js 14, React 18, TypeScript, PostgreSQL, NextAuth.js, Tailwind CSS

**Deployed on**: Vercel (serverless, zero-config deployments)

---

## License

MIT
