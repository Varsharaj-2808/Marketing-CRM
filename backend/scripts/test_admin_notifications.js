require('dotenv').config({ path: 'backend/.env' });
const { pool } = require('./src/config/db');

async function testNotifications() {
  console.log('--- Verifying Admin Notifications in DB ---');
  try {
    const adminRes = await pool.query(`SELECT id FROM users WHERE role = 'Admin' LIMIT 1`);
    const meRes = await pool.query(`SELECT id FROM users WHERE role = 'Marketing Executive' LIMIT 1`);
    
    if (adminRes.rows.length === 0 || meRes.rows.length === 0) {
       console.log('Users not found, skipping db test.');
       return process.exit(0);
    }
    const adminId = adminRes.rows[0].id;
    const meId = meRes.rows[0].id;
    
    // Simulate Notification dispatch
    const Notification = require('./src/models/Notification');
    await Notification.notifyAdmins({
        notificationType: 'test_event',
        leadId: null,
        message: 'This is a test admin broadcast'
    });
    
    const countRes = await pool.query(`SELECT count(*) FROM notifications WHERE notification_type = 'test_event' AND user_id = $1`, [adminId]);
    console.log(`Test Notifications for Admin: ${countRes.rows[0].count}`);
    
    if (parseInt(countRes.rows[0].count) > 0) {
        console.log('? notifyAdmins is successfully saving to DB');
    } else {
        console.log('? notifyAdmins failed');
    }
    
    // Now testing HTTP endpoint simulation via direct controller or fetch if server is running
    // I will just use fetch against the local running server!
    const { generateAccessToken } = require('./src/utils/tokenUtils');
    const adminUser = await pool.query(`SELECT * FROM users WHERE id = $1`, [adminId]);
    adminUser.rows[0]._id = adminId;
    const adminToken = generateAccessToken(adminUser.rows[0]);
    
    const API_URL = 'http://localhost:5000/api';
    const notifs = await fetch(`${API_URL}/admin/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    
    if (notifs.success && notifs.data.notifications.some(n => n.notification_type === 'test_event')) {
       console.log('? Admin API successfully returned the test notification');
    } else {
       console.log('? Admin API failed to return the test notification');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testNotifications();
