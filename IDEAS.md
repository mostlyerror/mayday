# Future Ideas

Ideas and features to implement later.

---

## Agency Portfolio Scraping

**Concept**: Broken sites often have "Built by XYZ Agency" in the footer. If the agency is dead/dormant, their entire portfolio becomes a lead list.

**Flow**:
1. Mayday finds a broken site
2. Detect "Built by ABC Agency" credit in footer/source
3. Check if ABC Agency is dead/dormant (their own site down, social media inactive, etc.)
4. If yes → scrape their portfolio page
5. Run all portfolio sites through Mayday scanner
6. Move on to next agency

**Why this works**:
- Agencies that go out of business leave behind orphaned client sites
- These sites often deteriorate without maintenance
- Portfolio pages are pre-filtered lists of businesses
- Multiplier effect: one dead agency → dozens of potential leads

**Implementation considerations**:
- Footer/source parsing for agency credits
- Agency health check (site status, last social media post, domain age)
- Portfolio page scraping (various formats)
- Deduplication with existing scanned businesses
- Rate limiting for large portfolios

---

## Website Quality Scoring

**Concept**: Beyond just "up/down", score sites on overall quality to find "your site works, but it's costing you customers" leads.

**Metrics to check**:
- Page load speed (Core Web Vitals)
- Mobile-friendliness
- Broken links/images
- Missing/invalid SSL
- Outdated copyright years (e.g., "© 2015")
- Poor accessibility (contrast, alt text, etc.)
- Outdated design patterns

**Value**: Creates a new lead category between "broken" and "fine" - sites that technically work but drive customers away.

---

## Social Media Health Check

**Concept**: For `social_only` leads, check if their social media is actually active. Inactive social + no website = stronger pitch.

**What to check**:
- Last post date on Facebook/Instagram/Twitter
- Post frequency (monthly? yearly? never?)
- Engagement levels (likes, comments)

**Pitch angle**: "Your Facebook hasn't been updated in 6 months AND you have no real website - you're invisible to customers searching online."

---

## Domain Expiration Monitoring

**Concept**: Use WHOIS lookups to find domains expiring soon. Reach out before they forget to renew.

**Implementation**:
- Check domain expiration dates
- Flag domains expiring in 30-90 days
- Priority outreach: "I noticed your domain expires next month..."

**Timing advantage**: Catch them when they're already thinking about their web presence.

---

## Event-Based Scanning

**Concept**: Scan more frequently around predictable events rather than fixed schedules.

**Triggers**:
- Domain/hosting renewal dates approaching
- Seasonal business cycles (tax prep in Jan-Apr, HVAC in summer/winter)
- After major storms/events that could impact sites
- Anniversary dates (yearly hosting renewals)

**Value**: Time outreach when businesses are most likely to care about their web presence.

---

## Business Size Indicators

**Concept**: Estimate business size/revenue potential to prioritize leads.

**Indicators from Google Places**:
- Number of reviews
- Average review rating
- Number of photos
- Years in business (from establishment date)
- Business category (e.g., law firms > barber shops in terms of website budget)

**Value**: Focus time on businesses most likely to afford and value web services.

---

## Lead Scoring System

**Concept**: Combine multiple factors into a single score to prioritize outreach.

**Score factors**:
- Issue severity (parked domain = 10, slow load = 3)
- Business size indicators
- Industry/category value
- Downtime duration
- Competition level (how many similar businesses in area)

**Output**: Ranked lead list, work top-down.

---

## Wayback Machine Integration

**Concept**: Show prospects their old working site vs. current broken state. Visual proof strengthens the pitch.

**Implementation**:
- Query Wayback Machine for historical snapshots
- Compare "then" vs "now"
- Include in outreach emails

**Pitch angle**: "Your site looked great in 2018. Here's what customers see today [broken screenshot]."

---

## Screenshot Capture

**Concept**: Capture what customers actually see - error pages, parking pages, expired hosting notices.

**Implementation**:
- Use headless browser (Puppeteer/Playwright)
- Capture screenshots during website checks
- Store with scan results
- Include in outreach materials

**Value**: Visual proof is more compelling than describing the problem.

---

## Automated Outreach Sequences

**Concept**: Generate personalized email templates based on the specific issue detected.

**Template examples**:
- SSL expired: Security-focused messaging
- Hosting expired: "Your Squarespace subscription lapsed..."
- Parked domain: "Your domain is just sitting there..."
- Social only: "Facebook isn't enough in 2025..."

**Features**:
- Merge fields (business name, issue type, detected date)
- Follow-up sequences
- Track open/response rates

---

## Notification System

**Concept**: Real-time alerts for high-priority leads or status changes.

**Notification triggers**:
- High-value lead found (big business with severe issue)
- Previously-working site goes down (re-engagement opportunity)
- Domain expiring soon
- Large batch of leads from agency portfolio

**Channels**: Email, SMS, Slack, Discord

---

## Multi-Location Campaigns

**Concept**: Run scans across multiple cities simultaneously, compare results.

**Features**:
- Configure multiple scan locations
- Run in parallel or scheduled
- Aggregate results dashboard
- Compare lead density by area
- Identify best markets for web services

**Value**: Scale beyond single location, find geographic opportunities.
