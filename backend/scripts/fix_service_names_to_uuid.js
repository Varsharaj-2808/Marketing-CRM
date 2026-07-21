/**
 * Fix leads where service_interested stores service NAMES instead of UUIDs
 * Run: node scripts/fix_service_names_to_uuid.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Build name → UUID map
    const svcRows = await client.query('SELECT id, name FROM services');
    const nameToUuid = {};
    svcRows.rows.forEach(r => { nameToUuid[r.name.trim().toLowerCase()] = r.id; });
    console.log('Service name→UUID map:', nameToUuid);

    // Find all leads with service_interested
    const leads = await client.query(
      'SELECT id, lead_id, service_interested FROM leads WHERE service_interested IS NOT NULL'
    );

    let fixed = 0;
    for (const lead of leads.rows) {
      let svcs = lead.service_interested;
      if (!Array.isArray(svcs)) continue;

      // Check if any value is not a UUID
      const hasNonUuid = svcs.some(v => !UUID_RE.test(String(v).trim()));
      if (!hasNonUuid) continue;

      // Map names → UUIDs
      const mapped = svcs.map(v => {
        const s = String(v).trim();
        if (UUID_RE.test(s)) return s;                        // already UUID
        return nameToUuid[s.toLowerCase()] || null;           // resolve by name
      }).filter(Boolean);

      // Deduplicate
      const deduped = [...new Set(mapped)];

      await client.query(
        'UPDATE leads SET service_interested = $1 WHERE id = $2',
        [deduped.length > 0 ? deduped : null, lead.id]
      );
      console.log(`Fixed ${lead.lead_id}: [${svcs.join(', ')}] → [${deduped.join(', ')}]`);
      fixed++;
    }

    console.log(`\nTotal leads fixed: ${fixed}`);

    // Final verification — check no non-UUID values remain
    const verifyLeads = await client.query(
      'SELECT id, lead_id, service_interested FROM leads WHERE service_interested IS NOT NULL'
    );
    let badCount = 0;
    for (const lead of verifyLeads.rows) {
      const svcs = lead.service_interested;
      if (!Array.isArray(svcs)) continue;
      const bad = svcs.filter(v => !UUID_RE.test(String(v).trim()));
      if (bad.length > 0) {
        console.log(`  STILL BAD: ${lead.lead_id}:`, bad);
        badCount++;
      }
    }

    if (badCount === 0) {
      console.log('\n✅ All service_interested values are now UUIDs or null — matches live!');
    } else {
      console.log(`\n⚠️  ${badCount} leads still have non-UUID values`);
    }

    // Sample output
    const sample = await client.query(
      'SELECT lead_id, service_interested FROM leads WHERE service_interested IS NOT NULL LIMIT 8'
    );
    console.log('\nFinal sample:');
    sample.rows.forEach(r => console.log(`  ${r.lead_id}:`, r.service_interested));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
