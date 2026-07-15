require('dotenv').config({ path: 'backend/.env' });
const emailService = require('./src/utils/emailService');
const { pool } = require('./src/config/db');

async function testAll() {
  console.log('--- Testing SMTP and DB Modules ---');
  
  // Test Email
  const res = await emailService.sendEmail({
    to: 'abikannayiram68@gmail.com',
    subject: 'E2E Final Verification Report',
    text: 'This email verifies that the SMTP system is fully functional.',
    html: '<b>This email verifies that the SMTP system is fully functional.</b>'
  });
  console.log('SMTP Delivery Result:', res.success ? '? SUCCESS' : '? FAILED');

  // Verify Notifications Table
  const notifs = await pool.query('SELECT COUNT(*) FROM notifications');
  console.log('Total In-App Notifications in DB:', notifs.rows[0].count);

  process.exit(0);
}
testAll();
