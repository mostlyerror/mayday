import { NextRequest, NextResponse } from 'next/server';
import { runScan, rescanDueBusinesses, getScanProgress } from '@/lib/scanner';

export async function GET() {
  const progress = getScanProgress();
  return NextResponse.json(progress);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'new', zipCodes, query, maxBusinesses } = body;

    if (type === 'rescan') {
      rescanDueBusinesses().catch(console.error);
    } else {
      runScan({ zipCodes, query, maxBusinesses }).catch(console.error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Scan started',
      progress: getScanProgress()
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
