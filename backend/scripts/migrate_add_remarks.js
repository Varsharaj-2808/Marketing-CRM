/**
 * Migration: Add remarks TEXT column to leads table
 *
 * Run: node scripts/migrate_add_remarks.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('\n── Checking leads schema ──────────────────────────────');
    const before = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leads'
      ORDER BY ordinal_position
    `);
    const cols = before.rows.map(r => r.column_name);
    console.log('Current columns:', cols.join(', '));

    if (cols.includes('remarks')) {
      console.log('\n✅ Column "remarks" already exists. No migration needed.');
      return;
    }

    console.log('\n── Adding remarks column ──────────────────────────────');
    await client.query(`ALTER TABLE leads ADD COLUMN remarks TEXT`);
    console.log('✅ ALTER TABLE executed.');

    const after = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'remarks'
    `);
    if (after.rows.length > 0) {
      console.log(`✅ Verified: leads.remarks (${after.rows[0].data_type})`);
    } else {
      console.error('❌ Verification failed: remarks column not found after ALTER TABLE');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
