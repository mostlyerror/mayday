import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadType = searchParams.get('lead_type') || undefined;

    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const leads = await getLeads({
      lead_type: leadType,
      center_lat: config.center.lat,
      center_lng: config.center.lng
    });

    const headers = ['Name', 'Phone', 'Address', 'Website', 'Category', 'Status', 'Status Detail', 'Lead Type', 'Days Down', 'Distance (mi)', 'Review Count', 'Rating', 'Social Links', 'Notes'];

    const rows = leads.map(lead => [
      lead.name, lead.phone || '', lead.address || '', lead.website_url || '',
      lead.category || '', lead.status, lead.status_detail || '', lead.lead_type || '',
      lead.days_down?.toString() || '', lead.distance_miles?.toFixed(1) || '',
      lead.review_count.toString(), lead.rating?.toString() || '',
      lead.social_links || '', lead.notes || ''
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mayday-leads-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
