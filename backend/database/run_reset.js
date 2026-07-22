require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runResetScript() {
  const scriptPath = path.join(__dirname, 'reset_crm_data_except_users.sql');
  console.log('Reading reset script from:', scriptPath);

  if (!fs.existsSync(scriptPath)) {
    console.error('Error: reset_crm_data_except_users.sql file not found!');
    process.exit(1);
  }

  const sql = fs.readFileSync(scriptPath, 'utf8');

  try {
    console.log('Connecting to database and executing TRUNCATE reset script...');
    await pool.query(sql);
    console.log('SUCCESS: Database reset completed successfully via TRUNCATE! All CRM business data has been deleted while keeping users and settings intact.');
  } catch (err) {
    console.error('ERROR executing reset script:', err.message);
  } finally {
    await pool.end();
  }
}

runResetScript();
