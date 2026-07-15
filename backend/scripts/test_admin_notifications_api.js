require('dotenv').config({ path: 'backend/.env' });
const { pool } = require('./src/config/db');

async function testNotifications() {
  console.log('--- Verifying Admin Notifications in DB ---');
  try {
    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'Admin' LIMIT 1`);
    if (adminRes.rows.length === 0) {
       console.log('Users not found, skipping db test.');
       return process.exit(0);
    }
    const adminId = adminRes.rows[0].id;
    
    // HTTP endpoint simulation
    const { generateAccessToken } = require('./src/utils/tokenUtils');
    const adminUser = await pool.query(`SELECT * FROM users WHERE id = $1`, [adminId]);
    adminUser.rows[0]._id = adminId;
    const adminToken = generateAccessToken(adminUser.rows[0]);
    
    const API_URL = 'http://localhost:5000/api';
    const notifs = await fetch(`${API_URL}/marketing/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    
    if (notifs.success && notifs.data.notifications.some(n => n.notification_type === 'test_event')) {
       console.log('? Admin API successfully returned the test notification from /marketing/notifications');
    } else {
       console.log('? Admin API failed to return the test notification (it might be missing or there is another issue)');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testNotifications();
