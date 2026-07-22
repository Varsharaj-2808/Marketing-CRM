require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const algoliaService = require('../src/utils/algoliaService');

async function main() {
  console.log('====================================================');
  console.log(' Marketing CRM - Algolia Rebuild Script');
  console.log('====================================================');
  console.log('Starting Algolia full re-index from PostgreSQL...');
  
  try {
    await algoliaService.recoverAndReindex();
    console.log('Algolia Rebuild completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Algolia Rebuild failed:', error);
    process.exit(1);
  }
}

main();
