require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');

async function checkDb() {
  try {
    // 1. Get notifications columns
    const columnsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
    `);
    console.log('--- notifications Table Columns ---');
    console.log(JSON.stringify(columnsRes.rows, null, 2));

    // 2. Query admin users
    const adminsRes = await pool.query(`
      SELECT id, role, email, name, "accountStatus" 
      FROM users 
      WHERE role = 'Admin'
    `);
    console.log('--- Admin Users in DB ---');
    console.log(JSON.stringify(adminsRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkDb();
