require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function init() {
  try {
    const sqlPath = path.resolve(__dirname, '../database/schema/init.sql');
    console.log('Reading init.sql from:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Connecting to database...');
    // test connection
    const timeRes = await pool.query('SELECT NOW()');
    console.log('Database connected successfully. Time:', timeRes.rows[0].now);
    
    console.log('Executing schema initialization...');
    await pool.query(sql);
    console.log('Database schema initialized successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('Initialization failed:', err.message);
    process.exit(1);
  }
}
init();
