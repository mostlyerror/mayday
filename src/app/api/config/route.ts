import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configFile);

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
