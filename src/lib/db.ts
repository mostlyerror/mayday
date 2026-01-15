import { neon } from '@neondatabase/serverless';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

export async function initializeDb(): Promise<void> {
  const sql = getDb();
  
  await sql`
    CREATE TABLE IF NOT EXISTS businesses (
      place_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      website_url TEXT,
      category TEXT,
      review_count INTEGER DEFAULT 0,
      rating REAL,
      latitude REAL,
      longitude REAL,
      business_status TEXT,
      social_links TEXT,
      date_first_scanned TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scan_results (
      id SERIAL PRIMARY KEY,
      place_id TEXT NOT NULL REFERENCES businesses(place_id),
      scan_date TIMESTAMP DEFAULT NOW(),
      status TEXT NOT NULL,
      status_detail TEXT,
      platform_detected TEXT,
      lead_type TEXT,
      first_detected_down TIMESTAMP,
      next_scan_date TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_usage (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      endpoint TEXT NOT NULL,
      calls_count INTEGER DEFAULT 0,
      estimated_cost REAL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS lead_tracking (
      id SERIAL PRIMARY KEY,
      place_id TEXT NOT NULL UNIQUE REFERENCES businesses(place_id),
      status TEXT DEFAULT 'new',
      notes TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scan_runs (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      businesses_scanned INTEGER DEFAULT 0,
      new_leads_found INTEGER DEFAULT 0,
      api_calls_used INTEGER DEFAULT 0
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_scan_results_place_id ON scan_results(place_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scan_results_status ON scan_results(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scan_results_lead_type ON scan_results(lead_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_businesses_website ON businesses(website_url)`;
}

export interface Business {
  place_id: string;
  name: string;
  address?: string;
  phone?: string;
  website_url?: string;
  category?: string;
  review_count: number;
  rating?: number;
  latitude?: number;
  longitude?: number;
  business_status?: string;
  social_links?: string;
  date_first_scanned?: string;
}

export async function upsertBusiness(business: Business): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO businesses (place_id, name, address, phone, website_url, category, review_count, rating, latitude, longitude, business_status, social_links)
    VALUES (${business.place_id}, ${business.name}, ${business.address ?? null}, ${business.phone ?? null},
      ${business.website_url ?? null}, ${business.category ?? null}, ${business.review_count ?? 0},
      ${business.rating ?? null}, ${business.latitude ?? null}, ${business.longitude ?? null},
      ${business.business_status ?? null}, ${business.social_links ?? null})
    ON CONFLICT(place_id) DO UPDATE SET
      name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone,
      website_url = EXCLUDED.website_url, category = EXCLUDED.category,
      review_count = EXCLUDED.review_count, rating = EXCLUDED.rating,
      latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
      business_status = EXCLUDED.business_status,
      social_links = COALESCE(EXCLUDED.social_links, businesses.social_links)
  `;
}

export async function getBusinessByPlaceId(placeId: string): Promise<Business | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM businesses WHERE place_id = ${placeId}`;
  return result[0] as Business | null;
}

export async function businessExists(placeId: string): Promise<boolean> {
  const sql = getDb();
  const result = await sql`SELECT 1 FROM businesses WHERE place_id = ${placeId}`;
  return result.length > 0;
}

export async function getBusinessesDueForRescan(): Promise<Business[]> {
  const sql = getDb();
  const result = await sql`
    SELECT DISTINCT ON (b.place_id) b.* FROM businesses b
    LEFT JOIN scan_results sr ON b.place_id = sr.place_id
    WHERE sr.next_scan_date IS NULL OR sr.next_scan_date <= NOW()
  `;
  return result as Business[];
}

export interface ScanResult {
  id?: number;
  place_id: string;
  scan_date?: string;
  status: string;
  status_detail?: string;
  platform_detected?: string;
  lead_type?: string;
  first_detected_down?: string;
  next_scan_date?: string;
}

export async function insertScanResult(result: ScanResult): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO scan_results (place_id, status, status_detail, platform_detected, lead_type, first_detected_down, next_scan_date)
    VALUES (${result.place_id}, ${result.status}, ${result.status_detail ?? null},
      ${result.platform_detected ?? null}, ${result.lead_type ?? null},
      ${result.first_detected_down ?? null}, ${result.next_scan_date ?? null})
  `;
}

export async function getLatestScanResult(placeId: string): Promise<ScanResult | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM scan_results WHERE place_id = ${placeId} ORDER BY scan_date DESC LIMIT 1`;
  return result[0] as ScanResult | null;
}

export interface Lead {
  place_id: string;
  name: string;
  address?: string;
  phone?: string;
  website_url?: string;
  category?: string;
  review_count: number;
  rating?: number;
  latitude?: number;
  longitude?: number;
  social_links?: string;
  status: string;
  status_detail?: string;
  lead_type?: string;
  first_detected_down?: string;
  days_down?: number;
  distance_miles?: number;
  tracking_status?: string;
  notes?: string;
}

export async function getLeads(filters?: {
  lead_type?: string;
  status?: string;
  max_distance?: number;
  center_lat?: number;
  center_lng?: number;
}): Promise<Lead[]> {
  const sql = getDb();
  
  let result;
  if (filters?.lead_type && filters?.status) {
    result = await sql`
      SELECT b.*, sr.status, sr.status_detail, sr.lead_type, sr.first_detected_down,
        EXTRACT(DAY FROM NOW() - sr.first_detected_down)::INTEGER as days_down,
        lt.status as tracking_status, lt.notes
      FROM businesses b
      INNER JOIN scan_results sr ON b.place_id = sr.place_id
      LEFT JOIN lead_tracking lt ON b.place_id = lt.place_id
      WHERE sr.lead_type IS NOT NULL
      AND sr.lead_type = ${filters.lead_type}
      AND sr.status = ${filters.status}
      AND sr.id = (SELECT id FROM scan_results WHERE place_id = b.place_id ORDER BY scan_date DESC LIMIT 1)
      ORDER BY CASE WHEN sr.first_detected_down >= NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END, b.review_count DESC
    `;
  } else if (filters?.lead_type) {
    result = await sql`
      SELECT b.*, sr.status, sr.status_detail, sr.lead_type, sr.first_detected_down,
        EXTRACT(DAY FROM NOW() - sr.first_detected_down)::INTEGER as days_down,
        lt.status as tracking_status, lt.notes
      FROM businesses b
      INNER JOIN scan_results sr ON b.place_id = sr.place_id
      LEFT JOIN lead_tracking lt ON b.place_id = lt.place_id
      WHERE sr.lead_type IS NOT NULL
      AND sr.lead_type = ${filters.lead_type}
      AND sr.id = (SELECT id FROM scan_results WHERE place_id = b.place_id ORDER BY scan_date DESC LIMIT 1)
      ORDER BY CASE WHEN sr.first_detected_down >= NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END, b.review_count DESC
    `;
  } else if (filters?.status) {
    result = await sql`
      SELECT b.*, sr.status, sr.status_detail, sr.lead_type, sr.first_detected_down,
        EXTRACT(DAY FROM NOW() - sr.first_detected_down)::INTEGER as days_down,
        lt.status as tracking_status, lt.notes
      FROM businesses b
      INNER JOIN scan_results sr ON b.place_id = sr.place_id
      LEFT JOIN lead_tracking lt ON b.place_id = lt.place_id
      WHERE sr.lead_type IS NOT NULL
      AND sr.status = ${filters.status}
      AND sr.id = (SELECT id FROM scan_results WHERE place_id = b.place_id ORDER BY scan_date DESC LIMIT 1)
      ORDER BY CASE WHEN sr.first_detected_down >= NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END, b.review_count DESC
    `;
  } else {
    result = await sql`
      SELECT b.*, sr.status, sr.status_detail, sr.lead_type, sr.first_detected_down,
        EXTRACT(DAY FROM NOW() - sr.first_detected_down)::INTEGER as days_down,
        lt.status as tracking_status, lt.notes
      FROM businesses b
      INNER JOIN scan_results sr ON b.place_id = sr.place_id
      LEFT JOIN lead_tracking lt ON b.place_id = lt.place_id
      WHERE sr.lead_type IS NOT NULL
      AND sr.id = (SELECT id FROM scan_results WHERE place_id = b.place_id ORDER BY scan_date DESC LIMIT 1)
      ORDER BY CASE WHEN sr.first_detected_down >= NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END, b.review_count DESC
    `;
  }

  let leads = result as Lead[];

  if (filters?.center_lat && filters?.center_lng) {
    leads = leads.map(lead => ({
      ...lead,
      distance_miles: lead.latitude && lead.longitude
        ? haversineDistance(filters.center_lat!, filters.center_lng!, Number(lead.latitude), Number(lead.longitude))
        : undefined
    }));
    if (filters.max_distance) {
      leads = leads.filter(l => l.distance_miles === undefined || l.distance_miles <= filters.max_distance!);
    }
    leads.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));
  }

  return leads;
}

export async function updateLeadTracking(placeId: string, status: string, notes?: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO lead_tracking (place_id, status, notes, updated_at) VALUES (${placeId}, ${status}, ${notes ?? null}, NOW())
    ON CONFLICT(place_id) DO UPDATE SET status = EXCLUDED.status, notes = COALESCE(EXCLUDED.notes, lead_tracking.notes), updated_at = NOW()
  `;
}

export async function trackApiUsage(endpoint: string, calls: number, cost: number): Promise<void> {
  const sql = getDb();
  const today = new Date().toISOString().split('T')[0];
  const existing = await sql`SELECT id FROM api_usage WHERE date = ${today} AND endpoint = ${endpoint}`;
  if (existing.length > 0) {
    await sql`UPDATE api_usage SET calls_count = calls_count + ${calls}, estimated_cost = estimated_cost + ${cost} WHERE date = ${today} AND endpoint = ${endpoint}`;
  } else {
    await sql`INSERT INTO api_usage (date, endpoint, calls_count, estimated_cost) VALUES (${today}, ${endpoint}, ${calls}, ${cost})`;
  }
}

export async function getApiUsageStats(): Promise<{
  today: { calls: number; cost: number };
  thisMonth: { calls: number; cost: number };
  total: { calls: number; cost: number };
}> {
  const sql = getDb();
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';
  
  const todayResult = await sql`SELECT COALESCE(SUM(calls_count), 0) as calls, COALESCE(SUM(estimated_cost), 0) as cost FROM api_usage WHERE date = ${today}`;
  const monthResult = await sql`SELECT COALESCE(SUM(calls_count), 0) as calls, COALESCE(SUM(estimated_cost), 0) as cost FROM api_usage WHERE date >= ${monthStart}`;
  const totalResult = await sql`SELECT COALESCE(SUM(calls_count), 0) as calls, COALESCE(SUM(estimated_cost), 0) as cost FROM api_usage`;

  return {
    today: { calls: Number(todayResult[0]?.calls || 0), cost: Number(todayResult[0]?.cost || 0) },
    thisMonth: { calls: Number(monthResult[0]?.calls || 0), cost: Number(monthResult[0]?.cost || 0) },
    total: { calls: Number(totalResult[0]?.calls || 0), cost: Number(totalResult[0]?.cost || 0) }
  };
}

export async function startScanRun(): Promise<number> {
  const sql = getDb();
  const result = await sql`INSERT INTO scan_runs (started_at) VALUES (NOW()) RETURNING id`;
  return Number(result[0]?.id || 0);
}

export async function completeScanRun(runId: number, businessesScanned: number, newLeadsFound: number, apiCallsUsed: number): Promise<void> {
  const sql = getDb();
  await sql`UPDATE scan_runs SET completed_at = NOW(), businesses_scanned = ${businessesScanned}, new_leads_found = ${newLeadsFound}, api_calls_used = ${apiCallsUsed} WHERE id = ${runId}`;
}

export async function getStats(): Promise<{
  totalBusinesses: number;
  byStatus: Record<string, number>;
  byLeadType: Record<string, number>;
  hotLeads: number;
  recentScans: Array<{ id: number; started_at: string; completed_at: string; businesses_scanned: number; new_leads_found: number }>;
}> {
  const sql = getDb();
  
  const totalResult = await sql`SELECT COUNT(*) as count FROM businesses`;
  const totalBusinesses = Number(totalResult[0]?.count || 0);
  
  const statusResult = await sql`
    SELECT sr.status, COUNT(*) as count FROM businesses b
    INNER JOIN scan_results sr ON b.place_id = sr.place_id
    WHERE sr.id = (SELECT id FROM scan_results WHERE place_id = b.place_id ORDER BY scan_date DESC LIMIT 1)
    GROUP BY sr.status
  `;
  const byStatus: Record<string, number> = {};
  statusResult.forEach(row => { byStatus[String(row.status)] = Number(row.count); });
  
  const leadTypeResult = await sql`
    SELECT sr.lead_type, COUNT(*) as count FROM businesses b
    INNER JOIN scan_results sr ON b.place_id = sr.place_id
    WHERE sr.lead_type IS NOT NULL
    AND sr.id = (SELECT id FROM scan_results WHERE place_id = b.place_id ORDER BY scan_date DESC LIMIT 1)
    GROUP BY sr.lead_type
  `;
  const byLeadType: Record<string, number> = {};
  leadTypeResult.forEach(row => { byLeadType[String(row.lead_type)] = Number(row.count); });
  
  const hotLeadsResult = await sql`SELECT COUNT(*) as count FROM scan_results WHERE first_detected_down >= NOW() - INTERVAL '7 days' AND lead_type IS NOT NULL`;
  const hotLeads = Number(hotLeadsResult[0]?.count || 0);
  
  const scansResult = await sql`SELECT id, started_at, completed_at, businesses_scanned, new_leads_found FROM scan_runs ORDER BY started_at DESC LIMIT 10`;
  const recentScans = scansResult.map(row => ({
    id: Number(row.id), started_at: String(row.started_at), completed_at: String(row.completed_at || ''),
    businesses_scanned: Number(row.businesses_scanned), new_leads_found: Number(row.new_leads_found)
  }));

  return { totalBusinesses, byStatus, byLeadType, hotLeads, recentScans };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function updateBusinessSocialLinks(placeId: string, socialLinks: string): Promise<void> {
  const sql = getDb();
  await sql`UPDATE businesses SET social_links = ${socialLinks} WHERE place_id = ${placeId}`;
}
