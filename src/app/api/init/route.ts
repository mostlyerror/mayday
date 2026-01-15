import { NextResponse } from 'next/server';
import { initializeDb } from '@/lib/db';

export async function POST() {
  try {
    await initializeDb();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
