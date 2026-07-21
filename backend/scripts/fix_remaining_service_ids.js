/**
 * Fix remaining rows where service_interested still has numeric IDs
 * Run: node scripts/fix_remaining_service_ids.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Show what's still numeric
    const badRows = await client.query(`
      SELECT l.id, l.lead_id, l.service_interested
      FROM leads l, UNNEST(service_interested) AS v
      WHERE v ~ '^[0-9]+$'
      GROUP BY l.id, l.lead_id, l.service_interested
    `);
    console.log('\nRows with numeric service_interested values:');
    badRows.rows.forEach(r => {
      console.log(`  lead_id=${r.lead_id}  service_interested=`, r.service_interested);
    });

    // Get current UUID map from services
    const svcRows = await client.query(`SELECT id, name FROM services`);
    const svcByUuid = {};
    svcRows.rows.forEach(r => { svcByUuid[r.id] = r.name; });

    // These are leads that still have numeric values that didn't match any service
    // Options:
    // 1. If name is stored (e.g. 'Web Development'), look up UUID by name
    // 2. If still numeric (no service found), set to NULL or keep as-is
    // Since all numeric IDs were migrated in step 1, any remaining numerics
    // are likely stored as integers that weren't in the original map.
    // Let's check what values remain:
    const remainingNums = await client.query(`
      SELECT DISTINCT v
      FROM leads, UNNEST(service_interested) AS v
      WHERE v ~ '^[0-9]+$'
      ORDER BY v
    `);
    console.log('\nDistinct remaining numeric values:', remainingNums.rows.map(r => r.v));

    // Try to look them up by id in services (in case migration missed them)
    const numericIds = remainingNums.rows.map(r => r.v);
    if (numericIds.length > 0) {
      // Get a fresh name→UUID map
      const svcNameMap = {};
      svcRows.rows.forEach(r => { svcNameMap[r.name.toLowerCase()] = r.id; });

      // For each bad lead, fix the values
      for (const lead of badRows.rows) {
        let svcs = lead.service_interested;
        if (!Array.isArray(svcs)) {
          if (typeof svcs === 'string') {
            try { svcs = JSON.parse(svcs); } catch(e) { svcs = [svcs]; }
          } else {
            svcs = [svcs];
          }
        }

        const fixed = svcs.map(v => {
          const str = String(v);
          // Already UUID — keep as is
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
            return str;
          }
          // Numeric — try name lookup or skip
          if (/^\d+$/.test(str)) {
            // Can't resolve — remove (use null placeholder, filtered below)
            console.log(`  Cannot resolve numeric id ${str} — removing from lead ${lead.lead_id}`);
            return null;
          }
          // Name string — look up UUID
          const uuid = svcNameMap[str.toLowerCase()];
          if (uuid) {
            console.log(`  Resolved name "${str}" → UUID ${uuid} for lead ${lead.lead_id}`);
            return uuid;
          }
          console.log(`  Cannot resolve name "${str}" — removing from lead ${lead.lead_id}`);
          return null;
        }).filter(Boolean);

        await client.query(
          `UPDATE leads SET service_interested = $1 WHERE id = $2`,
          [fixed.length > 0 ? fixed : null, lead.id]
        );
        console.log(`  Fixed lead ${lead.lead_id}: ${JSON.stringify(fixed)}`);
      }
    }

    // Final verification
    const finalCheck = await client.query(`
      SELECT COUNT(*) AS cnt
      FROM leads, UNNEST(service_interested) AS v
      WHERE v ~ '^[0-9]+$'
    `);
    const remaining = parseInt(finalCheck.rows[0]?.cnt || 0);
    if (remaining === 0) {
      console.log('\n✅ All service_interested values are now UUIDs or null');
    } else {
      console.log(`\n⚠️  Still ${remaining} numeric values remain`);
      const still = await client.query(`
        SELECT l.lead_id, l.service_interested
        FROM leads l, UNNEST(service_interested) AS v
        WHERE v ~ '^[0-9]+$'
        GROUP BY l.lead_id, l.service_interested
      `);
      still.rows.forEach(r => console.log(' ', r));
    }

    // Show final sample
    const sample = await client.query(`
      SELECT lead_id, service_interested FROM leads
      WHERE service_interested IS NOT NULL
      LIMIT 10
    `);
    console.log('\nSample leads after fix:');
    sample.rows.forEach(r => console.log(`  ${r.lead_id}:`, r.service_interested));

  } catch (err) {
    console.error('❌ Error:', err.message, err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
