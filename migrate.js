require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);");
    console.log('Column added');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
