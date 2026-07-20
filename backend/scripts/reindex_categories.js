require('dotenv').config();
const { query } = require('../src/config/db');

async function reindexCategories() {
  const catRes = await query('SELECT id, category_name, status, created_at, updated_at FROM business_categories ORDER BY category_name');
  const categories = catRes.rows;
  console.log(`Found ${categories.length} categories in DB`);

  const subRes = await query(`
    SELECT sc.id, sc.sub_category_name, sc.category_id, sc.created_at, sc.updated_at,
           bc.category_name AS parent_category_name, bc.status AS parent_status
    FROM business_sub_categories sc
    LEFT JOIN business_categories bc ON sc.category_id = bc.id
    ORDER BY sc.sub_category_name
  `);
  const subcategories = subRes.rows;
  console.log(`Found ${subcategories.length} subcategories in DB`);

  const catObjects = categories.map(c => ({
    objectID: c.id,
    id: c.id,
    category_name: c.category_name,
    name: c.category_name,
    subcategory_name: null,
    sub_category_name: null,
    parent_category_name: null,
    status: c.status || 'Active',
    isActive: c.status === 'Active',
    type: 'category',
    category_id: null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  const subObjects = subcategories.map(sc => ({
    objectID: sc.id,
    id: sc.id,
    category_name: sc.sub_category_name,
    name: sc.sub_category_name,
    subcategory_name: sc.sub_category_name,
    sub_category_name: sc.sub_category_name,
    parent_category_name: sc.parent_category_name || null,
    status: sc.parent_status || 'Active',
    isActive: (sc.parent_status || 'Active') === 'Active',
    type: 'subcategory',
    category_id: sc.category_id,
    parentCategoryId: sc.category_id,
    createdAt: sc.created_at,
    updatedAt: sc.updated_at,
  }));

  const allObjects = [...catObjects, ...subObjects];
  console.log(`Total objects to index: ${allObjects.length}`);

  const { algoliasearch } = require('algoliasearch');
  const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_WRITE_KEY || process.env.ALGOLIA_ADMIN_KEY);
  
  // Step 1: Clear the index completely (remove ALL stale records)
  await client.clearObjects({ indexName: 'categories' });
  console.log('✅ Cleared Algolia categories index');

  // Step 2: Re-add all current DB records
  await client.saveObjects({ indexName: 'categories', objects: allObjects });
  console.log(`✅ Re-indexed ${allObjects.length} category/subcategory objects to Algolia.`);
  console.log(`   - Categories: ${catObjects.length}`);
  console.log(`   - Subcategories: ${subObjects.length}`);
}

reindexCategories().catch(console.error).finally(() => process.exit());
