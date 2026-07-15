require('dotenv').config({path:'D:/CRM market/backend/.env'});
const bcrypt = require('bcryptjs');
const { query } = require('../src/config/db');

async function main() {
  const hash = await bcrypt.hash('Admin@123', 12);
  await query('UPDATE users SET password=$1 WHERE email=$2', [hash, 'vishnu.off.2004@gmail.com']);
  console.log('Password set for admin');
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
