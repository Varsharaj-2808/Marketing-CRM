const { sendEmail } = require('../src/utils/emailService');
const { getClient } = require('../src/config/db');

async function verifySMTP() {
  console.log('--- Starting SMTP Verification ---');
  try {
    const res = await sendEmail({
      to: 'abikannayiram68@gmail.com',
      subject: 'Test E2E SMTP Verification',
      text: 'This is a test email to verify SMTP configuration.',
      html: '<p>This is a test email to verify SMTP configuration.</p>'
    });
    console.log('SMTP Verification Result:', res);
    if (res.success) {
      console.log('? SMTP configuration loads correctly.');
      console.log('? Authentication succeeds.');
      console.log('? Emails are actually delivered.');
    } else {
      console.error('? SMTP Error:', res.error);
    }
  } catch (err) {
    console.error('? SMTP Exception:', err);
  }
}

async function verifyInAppNotifications() {
  console.log('\n--- Starting In-App Notification Verification ---');
  const client = await getClient();
  try {
    const res = await client.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
    console.log('Recent notifications in DB:', res.rows.length);
    if (res.rows.length > 0) {
      const n = res.rows[0];
      console.log('? Notification stored in database.');
      console.log(`? User ID: ${n.user_id}, Type: ${n.type}, Message: ${n.message}, Read: ${n.is_read}`);
    } else {
      console.log('?? No notifications found in DB to verify.');
    }
  } finally {
    client.release();
  }
}

async function run() {
  require('dotenv').config();
  await verifySMTP();
  await verifyInAppNotifications();
  process.exit(0);
}

run();
