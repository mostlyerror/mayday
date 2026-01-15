import { NextRequest, NextResponse } from 'next/server';
import { getLeads, updateLeadTracking } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadType = searchParams.get('lead_type') || undefined;
    const status = searchParams.get('status') || undefined;
    const maxDistance = searchParams.get('max_distance') ? parseFloat(searchParams.get('max_distance')!) : undefined;

    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const leads = await getLeads({
      lead_type: leadType,
      status,
      max_distance: maxDistance,
      center_lat: config.center.lat,
      center_lng: config.center.lng
    });

    return NextResponse.json({ leads, count: leads.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { place_id, tracking_status, notes } = body;

    if (!place_id || !tracking_status) {
      return NextResponse.json({ error: 'place_id and tracking_status are required' }, { status: 400 });
    }

    await updateLeadTracking(place_id, tracking_status, notes);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
