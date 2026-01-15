import { NextResponse } from 'next/server';
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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
