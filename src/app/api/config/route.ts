import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedConfig: unknown | null = null;
let cachedConfigPromise: Promise<unknown> | null = null;

export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');

    if (cachedConfig !== null) {
      return NextResponse.json(cachedConfig);
    }

    if (!cachedConfigPromise) {
      cachedConfigPromise = fs.promises
        .readFile(configPath, 'utf-8')
        .then((configFile) => {
          const parsed = JSON.parse(configFile);
          cachedConfig = parsed;
          return parsed;
        })
        .catch((err) => {
          cachedConfigPromise = null;
          throw err;
        });
    }

    const config = await cachedConfigPromise;
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load configuration file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { center, radius_miles, monthly_budget_usd } = body;

    // Server-side validation
    if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number' || !center.label) {
      return NextResponse.json({ error: 'Invalid center configuration' }, { status: 400 });
    }

    if (center.lat < -90 || center.lat > 90) {
      return NextResponse.json({ error: 'Latitude must be between -90 and 90' }, { status: 400 });
    }

    if (center.lng < -180 || center.lng > 180) {
      return NextResponse.json({ error: 'Longitude must be between -180 and 180' }, { status: 400 });
    }

    if (typeof radius_miles !== 'number' || radius_miles <= 0 || radius_miles > 50) {
      return NextResponse.json({ error: 'Radius must be between 1 and 50 miles' }, { status: 400 });
    }

    if (typeof monthly_budget_usd !== 'number' || monthly_budget_usd <= 0) {
      return NextResponse.json({ error: 'Monthly budget must be greater than 0' }, { status: 400 });
    }

    // Read existing config to preserve blocklist_path
    const configPath = path.join(process.cwd(), 'config.json');
    const existingConfig = JSON.parse(await fs.promises.readFile(configPath, 'utf-8'));

    // Build new config (preserve blocklist_path)
    const newConfig = {
      center: {
        lat: center.lat,
        lng: center.lng,
        label: center.label.trim()
      },
      radius_miles,
      blocklist_path: existingConfig.blocklist_path,
      monthly_budget_usd
    };

    // Write to file with pretty formatting
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(newConfig, null, 2) + '\n',
      'utf-8'
    );

    // Clear cache to force reload on next GET
    cachedConfig = null;
    cachedConfigPromise = null;

    return NextResponse.json({ success: true, config: newConfig });

  } catch (error) {
    console.error('Failed to update configuration:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
