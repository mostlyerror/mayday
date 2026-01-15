#!/usr/bin/env tsx
// Check actual scan results
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

dotenv.config({ path: '.env.local' });

async function checkResults() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('\n=== SCAN RESULTS ===\n');

  const statusCounts = await sql`
    SELECT status, COUNT(*) as count
    FROM scan_results
    GROUP BY status
    ORDER BY count DESC
  `;

  console.log('Status breakdown:');
  statusCounts.forEach(row => {
    console.log(`  ${row.status}: ${row.count}`);
  });

  console.log('\n=== LEAD TYPE BREAKDOWN ===\n');

  const leadCounts = await sql`
    SELECT lead_type, COUNT(*) as count
    FROM scan_results
    WHERE lead_type IS NOT NULL
    GROUP BY lead_type
    ORDER BY count DESC
  `;

  console.log('Lead types:');
  if (leadCounts.length === 0) {
    console.log('  ❌ NO LEADS FOUND');
  } else {
    leadCounts.forEach(row => {
      console.log(`  ${row.lead_type}: ${row.count}`);
    });
  }

  console.log('\n=== SAMPLE BUSINESSES ===\n');

  const samples = await sql`
    SELECT b.name, b.website_url, sr.status, sr.status_detail, sr.lead_type
    FROM businesses b
    JOIN scan_results sr ON b.place_id = sr.place_id
    ORDER BY sr.scan_date DESC
    LIMIT 10
  `;

  samples.forEach((row, i) => {
    console.log(`${i + 1}. ${row.name}`);
    console.log(`   URL: ${row.website_url || 'NO WEBSITE'}`);
    console.log(`   Status: ${row.status}`);
    if (row.status_detail) console.log(`   Detail: ${row.status_detail}`);
    console.log(`   Lead Type: ${row.lead_type || 'none'}`);
    console.log('');
  });

  process.exit(0);
}

checkResults().catch(console.error);
