require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');

async function getME() {
  const res = await pool.query(`SELECT id, role, email, name, "accountStatus" FROM users WHERE role = 'Marketing Executive'`);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
getME();
