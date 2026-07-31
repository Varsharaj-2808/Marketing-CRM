require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { algoliasearch } = require('algoliasearch');

/**
 * Maintenance script to clear Marketing CRM data from Algolia search indexes.
 * 
 * Requirements:
 * 1. Uses existing project Algolia configuration (.env).
 * 2. Does NOT touch database schema or tables.
 * 3. Clears CRM indexes using official Algolia client (clearObjects).
 * 4. Preserves 'users' index by default unless explicitly configured otherwise.
 * 5. Handles missing or inaccessible indexes gracefully without crashing.
 * 6. Logs record counts before and after clearing each index.
 * 7. Returns and displays a detailed execution summary.
 */

// Algolia Configuration
const appId = process.env.ALGOLIA_APP_ID || '';
const apiKey = process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_WRITE_KEY || '';

// Configured CRM Algolia Index Names
const CRM_INDEXES = [
  'leads',
  'categories',
  'business_categories',
  'business_sub_categories',
  'services',
  'lead_sources',
  'notifications',
  'audit_logs',
  'followups',
  'users',
];

/**
 * Safely fetches the current hit count for an index.
 */
async function getRecordCount(client, indexName) {
  try {
    const result = await client.searchSingleIndex({
      indexName,
      searchParams: { query: '', hitsPerPage: 0 },
    });
    return result && typeof result.nbHits === 'number' ? result.nbHits : 0;
  } catch (err) {
    return null; // Return null if index is missing or inaccessible
  }
}

/**
 * Clears CRM records from Algolia indexes.
 * @param {Object} options
 * @param {boolean} [options.preserveUsers=true] - Whether to preserve the 'users' index
 * @returns {Promise<Object>} Execution summary object
 */
async function resetAlgoliaIndexes(options = {}) {
  const preserveUsers = options.preserveUsers !== undefined ? options.preserveUsers : true;

  console.log('====================================================');
  console.log(' Marketing CRM - Algolia Index Reset Script');
  console.log('====================================================');
  console.log(`Preserve Users Index: ${preserveUsers ? 'YES (Default)' : 'NO (Clearing users)'}`);

  if (!appId || !apiKey) {
    console.error('ERROR: Missing Algolia configuration. Please check ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY / ALGOLIA_WRITE_KEY in .env file.');
    return {
      success: false,
      error: 'Algolia credentials missing',
      cleared: [],
      skipped: [],
      failed: [],
    };
  }

  const client = algoliasearch(appId, apiKey);

  const summary = {
    success: true,
    cleared: [],
    skipped: [],
    failed: [],
    notFound: [],
  };

  for (const indexName of CRM_INDEXES) {
    // 1. Preserve User Management Index if configured
    if (indexName === 'users' && preserveUsers) {
      const countBefore = await getRecordCount(client, indexName);
      const countStr = countBefore !== null ? `${countBefore} records` : 'count unavailable';
      console.log(`[SKIPPED] Index: '${indexName}' (${countStr}) - Preserved by configuration.`);
      summary.skipped.push({ indexName, reason: 'Preserved by configuration', recordsBefore: countBefore });
      continue;
    }

    try {
      // 2. Fetch status before clearing
      const countBefore = await getRecordCount(client, indexName);

      if (countBefore === null) {
        console.log(`[SKIPPED] Index: '${indexName}' - Index does not exist or is not initialized in Algolia.`);
        summary.notFound.push(indexName);
        summary.skipped.push({ indexName, reason: 'Index not found / uninitialized', recordsBefore: 0 });
        continue;
      }

      console.log(`[CLEARING] Index: '${indexName}' - Current records: ${countBefore}...`);

      // 3. Clear all records from index and wait for Algolia server task completion
      const res = await client.clearObjects({ indexName });
      if (res && res.taskID) {
        await client.waitForTask({ indexName, taskID: res.taskID });
      }

      // 4. Fetch status after clearing
      const countAfter = await getRecordCount(client, indexName);

      console.log(`[CLEARED] Index: '${indexName}' - Records after reset: ${countAfter !== null ? countAfter : 0}`);
      summary.cleared.push({
        indexName,
        recordsBefore: countBefore,
        recordsAfter: countAfter !== null ? countAfter : 0,
      });

    } catch (err) {
      console.error(`[FAILED] Index: '${indexName}' - Error: ${err.message}`);
      summary.failed.push({ indexName, error: err.message });
    }
  }

  console.log('\n====================================================');
  console.log(' ALGOLIA RESET SUMMARY');
  console.log('====================================================');
  console.log(`Cleared Indexes : ${summary.cleared.length}`);
  console.log(`Skipped Indexes : ${summary.skipped.length}`);
  console.log(`Failed Indexes  : ${summary.failed.length}`);

  if (summary.cleared.length > 0) {
    console.log('\nCleared Detail:');
    summary.cleared.forEach(item => {
      console.log(`  - ${item.indexName}: ${item.recordsBefore} -> ${item.recordsAfter} records`);
    });
  }

  if (summary.skipped.length > 0) {
    console.log('\nSkipped Detail:');
    summary.skipped.forEach(item => {
      console.log(`  - ${item.indexName} (${item.reason})`);
    });
  }

  if (summary.failed.length > 0) {
    summary.success = false;
    console.log('\nFailed Detail:');
    summary.failed.forEach(item => {
      console.log(`  - ${item.indexName}: ${item.error}`);
    });
  }

  console.log('====================================================\n');

  return summary;
}

// Direct Execution Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const clearUsersArg = args.includes('--clear-users') || args.includes('--include-users');
  const preserveUsers = !clearUsersArg;

  resetAlgoliaIndexes({ preserveUsers })
    .then(summary => {
      process.exit(summary.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal execution error:', err.message);
      process.exit(1);
    });
}

module.exports = { resetAlgoliaIndexes };
