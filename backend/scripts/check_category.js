require('dotenv').config();
const { query } = require('../src/config/db');

async function check() {
  const categoryId = 'f1938320-a1e7-4a75-a64c-9e2dd0d2775e';
  const result = await query('SELECT id, category_name, status FROM business_categories WHERE id = $1', [categoryId]);
  console.log('DB Result:', JSON.stringify(result.rows, null, 2));

  const algoliaResult = await query(`
    SELECT id, category_name, status FROM business_categories LIMIT 10
  `);
  console.log('All Categories:', JSON.stringify(algoliaResult.rows, null, 2));
}

check().catch(console.error).finally(() => process.exit());
