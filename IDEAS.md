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
