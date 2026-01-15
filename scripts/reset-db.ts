#!/usr/bin/env tsx
// Database reset script
import dotenv from 'dotenv';
import { initializeDb } from '../src/lib/db';

// Load environment variables from .env.local file (Next.js convention)
dotenv.config({ path: '.env.local' });

async function resetDatabase() {
  console.log('🔄 Resetting database...');

  try {
    await initializeDb();
    console.log('✅ Database reset successfully!');
    console.log('📊 All tables have been dropped and recreated.');
    console.log('🚀 You can now run a new scan to populate with fresh data.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
