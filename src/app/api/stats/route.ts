import { NextResponse } from 'next/server';
import { getStats, getApiUsageStats } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    const stats = await getStats();
    const apiUsage = await getApiUsageStats();

    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    return NextResponse.json({
      ...stats,
      apiUsage: {
        ...apiUsage,
        monthlyBudget: config.monthly_budget_usd,
        remainingBudget: config.monthly_budget_usd - apiUsage.thisMonth.cost
      }
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
