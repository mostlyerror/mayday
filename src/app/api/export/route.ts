import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateCSV,
  generateXLSX,
  generateJSON,
  getContentType,
  getFilename,
  AVAILABLE_COLUMNS,
  DEFAULT_COLUMNS,
} from '@/lib/export-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'xlsx' | 'json';
    const columnsParam = searchParams.get('columns');
    const leadType = searchParams.get('lead_type') || undefined;
    const status = searchParams.get('status') || undefined;
    const maxDistance = searchParams.get('max_distance')
      ? parseFloat(searchParams.get('max_distance')!)
      : undefined;

    // Determine columns to export
    const columns = columnsParam
      ? columnsParam.split(',').filter(col => AVAILABLE_COLUMNS.some(c => c.key === col))
      : DEFAULT_COLUMNS;

    // Ensure required columns are included
    const requiredColumns = AVAILABLE_COLUMNS.filter(c => c.required).map(c => c.key);
    const finalColumns = Array.from(new Set([...requiredColumns, ...columns]));

    // Load config for center coordinates
    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Fetch leads with all filters
    const leads = await getLeads({
      lead_type: leadType,
      status: status,
      max_distance: maxDistance,
      center_lat: config.center.lat,
      center_lng: config.center.lng,
    });

    // Return 404 if no leads found
    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found matching the specified filters' },
        { status: 404 }
      );
    }

    // Generate content based on format
    let content: string | Uint8Array;
    const leadsData = leads as unknown as Record<string, unknown>[];
    switch (format) {
      case 'xlsx':
        content = new Uint8Array(generateXLSX(leadsData, finalColumns));
        break;
      case 'json':
        content = generateJSON(leadsData, finalColumns);
        break;
      case 'csv':
      default:
        content = generateCSV(leadsData, finalColumns);
        break;
    }

    // Return response with appropriate headers
    return new NextResponse(content as BodyInit, {
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${getFilename(format)}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
