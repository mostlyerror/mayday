#!/usr/bin/env tsx
// Test a single URL with the website checker
import dotenv from 'dotenv';
import { checkWebsite } from '../src/lib/website-checker';

dotenv.config({ path: '.env.local' });

const url = process.argv[2];

if (!url) {
  console.error('Usage: npm run test:url <url>');
  process.exit(1);
}

async function testUrl() {
  console.log(`\nTesting: ${url}\n`);

  try {
    const result = await checkWebsite(url, 'test-place-id');

    console.log('Result:');
    console.log(`  Status: ${result.status}`);
    console.log(`  Lead Type: ${result.leadType || 'none'}`);
    if (result.statusDetail) {
      console.log(`  Detail: ${result.statusDetail}`);
    }
    if (result.platformDetected) {
      console.log(`  Platform: ${result.platformDetected}`);
    }
    if (result.socialLinks) {
      console.log(`  Social Links:`, result.socialLinks);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

testUrl();
