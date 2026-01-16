# Mayday

A Next.js application that scans local businesses via Google Places API, checks their websites for issues, and surfaces leads for web development services.

## Features

Identifies three types of leads:
- **Fix** - Sites with errors (4xx/5xx, SSL issues, expired hosting, parked domains)
- **Build** - Businesses with no website listed
- **Social Only** - Businesses where the website just redirects to social media

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React 18, Tailwind CSS
- **Database**: Neon PostgreSQL
- **Authentication**: NextAuth.js with credentials provider
- **External APIs**: Google Places API

## Setup

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

## Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report
```

## Commands

```bash
npm run dev              # Development server at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm test                 # Run Jest test suite
npm run db:reset         # Reset database (drops all tables and recreates schema)
```

## License

MIT
