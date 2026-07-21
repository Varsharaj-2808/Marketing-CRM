/**
 * Migration: Convert services & lead_sources from INTEGER id to UUID id
 * and update leads.service_interested to store UUID arrays.
 *
 * Run: node scripts/migrate_service_uuid.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // ── Step 0: Inspect current schema ────────────────────────────────────
    console.log('\n── Current schema check ──────────────────────────────');

    const servicesSchema = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'services' AND column_name = 'id'
    `);
    console.log('services.id type:', servicesSchema.rows[0] || 'not found');

    const lsSchema = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'lead_sources' AND column_name = 'id'
    `);
    console.log('lead_sources.id type:', lsSchema.rows[0] || 'not found');

    const siSchema = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'service_interested'
    `);
    console.log('leads.service_interested type:', siSchema.rows[0] || 'not found');

    const svcIdType = servicesSchema.rows[0]?.data_type;
    const lsIdType  = lsSchema.rows[0]?.data_type;

    // ── Step 1: Migrate services table if id is still integer ─────────────
    if (svcIdType && svcIdType !== 'uuid') {
      console.log('\n── Migrating services.id INTEGER → UUID ──────────────');
      await client.query('BEGIN');

      await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      await client.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS new_uuid_id UUID DEFAULT gen_random_uuid()`);

      const svcRows = await client.query(`SELECT id, new_uuid_id FROM services`);
      console.log(`  ${svcRows.rows.length} service rows to migrate`);

      const svcMap = {};
      svcRows.rows.forEach(r => { svcMap[String(r.id)] = r.new_uuid_id; });
      console.log('  Service ID map:', svcMap);

      const leadRows = await client.query(
        `SELECT id, service_interested FROM leads WHERE service_interested IS NOT NULL`
      );
      let updatedLeads = 0;
      for (const lead of leadRows.rows) {
        let svcs = lead.service_interested;
        if (!Array.isArray(svcs)) {
          if (typeof svcs === 'string') {
            try { svcs = JSON.parse(svcs); } catch (e) { svcs = [svcs]; }
          } else {
            svcs = [svcs];
          }
        }
        const newSvcs = svcs.map(v => svcMap[String(v)] || v);
        await client.query(
          `UPDATE leads SET service_interested = $1 WHERE id = $2`,
          [newSvcs, lead.id]
        );
        updatedLeads++;
      }
      console.log(`  Updated ${updatedLeads} leads with new UUIDs`);

      await client.query(`ALTER TABLE services DROP CONSTRAINT IF EXISTS services_pkey`);
      await client.query(`ALTER TABLE services DROP COLUMN id`);
      await client.query(`ALTER TABLE services RENAME COLUMN new_uuid_id TO id`);
      await client.query(`ALTER TABLE services ADD PRIMARY KEY (id)`);
      await client.query(`DROP SEQUENCE IF EXISTS services_id_seq`);

      await client.query('COMMIT');
      console.log('  ✅ services.id migrated to UUID');
    } else if (svcIdType === 'uuid') {
      console.log('\n  ✅ services.id is already UUID — no migration needed');
    } else {
      console.log('\n  ⚠️  services table not found or unexpected type:', svcIdType);
    }

    // ── Step 2: Migrate lead_sources table if id is still integer ─────────
    if (lsIdType && lsIdType !== 'uuid') {
      console.log('\n── Migrating lead_sources.id INTEGER → UUID ──────────');
      await client.query('BEGIN');

      await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      await client.query(`ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS new_uuid_id UUID DEFAULT gen_random_uuid()`);

      const lsRows = await client.query(`SELECT id, new_uuid_id FROM lead_sources`);
      console.log(`  ${lsRows.rows.length} lead_source rows to migrate`);

      const lsMap = {};
      lsRows.rows.forEach(r => { lsMap[String(r.id)] = r.new_uuid_id; });
      console.log('  Lead Source ID map:', lsMap);

      const leadRows = await client.query(
        `SELECT id, lead_source FROM leads WHERE lead_source IS NOT NULL`
      );
      let updatedLeads = 0;
      for (const lead of leadRows.rows) {
        const oldVal = String(lead.lead_source).trim();
        if (/^\d+$/.test(oldVal) && lsMap[oldVal]) {
          await client.query(
            `UPDATE leads SET lead_source = $1 WHERE id = $2`,
            [lsMap[oldVal], lead.id]
          );
          updatedLeads++;
        }
      }
      console.log(`  Updated ${updatedLeads} leads with new lead_source UUIDs`);

      await client.query(`ALTER TABLE lead_sources DROP CONSTRAINT IF EXISTS lead_sources_pkey`);
      await client.query(`ALTER TABLE lead_sources DROP COLUMN id`);
      await client.query(`ALTER TABLE lead_sources RENAME COLUMN new_uuid_id TO id`);
      await client.query(`ALTER TABLE lead_sources ADD PRIMARY KEY (id)`);
      await client.query(`DROP SEQUENCE IF EXISTS lead_sources_id_seq`);

      await client.query('COMMIT');
      console.log('  ✅ lead_sources.id migrated to UUID');
    } else if (lsIdType === 'uuid') {
      console.log('\n  ✅ lead_sources.id is already UUID — no migration needed');
    } else {
      console.log('\n  ⚠️  lead_sources table not found or unexpected type:', lsIdType);
    }

    // ── Step 3: Verification ───────────────────────────────────────────────
    console.log('\n── Post-migration verification ───────────────────────');

    const svcSample = await client.query(`SELECT id, name FROM services LIMIT 5`);
    console.log('services (sample):', svcSample.rows);

    const lsSample = await client.query(`SELECT id, name FROM lead_sources LIMIT 5`);
    console.log('lead_sources (sample):', lsSample.rows);

    const numericCheck = await client.query(`
      SELECT COUNT(*) AS cnt
      FROM leads, UNNEST(service_interested) AS v
      WHERE v ~ '^[0-9]+$'
    `);
    const remaining = parseInt(numericCheck.rows[0]?.cnt || 0);
    if (remaining === 0) {
      console.log('\n  ✅ No numeric IDs remain in leads.service_interested');
    } else {
      console.log('\n  ⚠️  ' + remaining + ' rows still have numeric IDs in service_interested');
    }

    console.log('\n── Migration complete ────────────────────────────────\n');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
