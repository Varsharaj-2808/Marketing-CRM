require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');

async function alterTable() {
  try {
    console.log('Connecting to database...');
    // test connection
    const timeRes = await pool.query('SELECT NOW()');
    console.log('Connected. Running ALTER COLUMN...');
    
    // Check type of service_interested before change
    const checkRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'service_interested'
    `);
    console.log('Current type:', checkRes.rows[0]);

    // Perform ALTER
    await pool.query(`
      ALTER TABLE leads 
      ALTER COLUMN service_interested TYPE JSONB 
      USING to_jsonb(service_interested);
    `);
    console.log('ALTER COLUMN successful!');

    // Check type of service_interested after change
    const checkRes2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads' AND column_name = 'service_interested'
    `);
    console.log('New type:', checkRes2.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error('Failed to alter table:', err.message);
    process.exit(1);
  }
}
alterTable();
