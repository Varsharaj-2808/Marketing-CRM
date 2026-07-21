require('dotenv').config();
const { query } = require('../src/config/db');

async function migrate() {
  const svcRes = await query('SELECT id::text, name FROM services');
  const map = {};
  svcRes.rows.forEach(r => {
    map[r.id] = r.name;
    map[r.name] = r.name;
  });

  const leadsRes = await query('SELECT id, service_interested FROM leads WHERE service_interested IS NOT NULL');
  let updatedCount = 0;

  for (const row of leadsRes.rows) {
    let svcs = row.service_interested;
    if (typeof svcs === 'string') {
      try { svcs = JSON.parse(svcs); } catch (e) {}
    }
    const arr = Array.isArray(svcs) ? svcs : [svcs];
    const mapped = arr.map(v => map[String(v)] || String(v));
    await query('UPDATE leads SET service_interested = $1 WHERE id = $2', [mapped, row.id]);
    updatedCount++;
  }
  console.log(`Successfully migrated ${updatedCount} leads in DB to service names.`);
}

migrate().catch(console.error).finally(() => process.exit());
