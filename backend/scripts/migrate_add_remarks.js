require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log('\n── Executing Migration: Add remarks column to leads ──────────────────────────────');

    const migrationPath = path.join(__dirname, '../database/migrations/001_add_remarks_to_leads.sql');
    let sql;
    if (fs.existsSync(migrationPath)) {
      sql = fs.readFileSync(migrationPath, 'utf8');
      console.log(`Loaded migration file: ${path.basename(migrationPath)}`);
    } else {
      sql = `ALTER TABLE leads ADD COLUMN IF NOT EXISTS remarks TEXT;`;
    }

    await client.query(sql);
    console.log('✅ ALTER function / migration script executed successfully.');

    const after = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'remarks'
    `);
    if (after.rows.length > 0) {
      console.log(`✅ Verified: leads.remarks (${after.rows[0].data_type})`);
    } else {
      console.error('❌ Verification failed: remarks column not found after migration execution');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

