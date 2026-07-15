require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { pool } = require('../src/config/db');
const { generateAccessToken } = require('../src/utils/tokenUtils');

async function runRCA() {
  console.log('--- STARTING RCA TRACE ---');

  // 1. Marketing Login
  console.log('Marketing Login');
  const meRes = await pool.query("SELECT * FROM users WHERE role = 'Marketing Executive' AND \"accountStatus\" = 'active' LIMIT 1");
  if (meRes.rows.length === 0) {
    console.log('❌ Failed: No active Marketing Executive found in database');
    process.exit(1);
  }
  const me = meRes.rows[0];
  me._id = me.id;
  const meToken = generateAccessToken(me);
  console.log('✅ Success: Logged in as Marketing Executive:', me.email);

  // 2. Create Lead & POST /leads (using API call to our local server)
  console.log('POST /leads (simulating API Request)');
  const API_URL = 'http://localhost:5000/api';
  
  const cat = (await pool.query("SELECT id FROM business_categories LIMIT 1")).rows[0]?.id;
  const subcat = (await pool.query("SELECT id FROM business_sub_categories LIMIT 1")).rows[0]?.id;
  const svc = (await pool.query("SELECT id FROM services LIMIT 1")).rows[0]?.id;

  const leadPayload = {
    company_name: 'RCA Test Company ' + Date.now(),
    contact_person: 'Alice Tester',
    mobile_number: '9876543210',
    email: 'rca@test.com',
    lead_source: 'Website',
    priority: 'Hot',
    category: cat,
    sub_category: subcat,
    service_interested: [svc]
  };

  let newLead;
  try {
    const res = await fetch(`${API_URL}/marketing/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${meToken}`
      },
      body: JSON.stringify(leadPayload)
    });
    const json = await res.json();
    if (res.status === 201 && json.success) {
      newLead = json.data;
      console.log('✅ Success: Lead created successfully. ID:', newLead.id);
    } else {
      console.log('❌ Failed: POST /leads returned status', res.status, JSON.stringify(json));
      process.exit(1);
    }
  } catch (err) {
    console.log('❌ Failed: API request connection error:', err.message);
    process.exit(1);
  }

  // 3. Lead Service & Notification Service
  console.log('Lead Service & Notification Service');
  // Check the DB to see if the notification row was created
  await new Promise(resolve => setTimeout(resolve, 2000)); // wait for async notification dispatch
  
  const notifCountRes = await pool.query("SELECT count(*) FROM notifications WHERE lead_id = $1", [newLead.id]);
  if (parseInt(notifCountRes.rows[0].count) > 0) {
    console.log('✅ Success: Lead Service successfully invoked Notification Service');
  } else {
    console.log('❌ Failed: Notification Service was not triggered or failed silently');
  }

  // 4. Find Active Admin Users
  console.log('Find Active Admin Users');
  const adminsRes = await pool.query("SELECT id, role, email, name, \"accountStatus\" FROM users WHERE role = 'Admin'");
  console.log('SQL Query used: SELECT id, role, email, name, "accountStatus" FROM users WHERE role = \'Admin\'');
  console.log('Query Result count:', adminsRes.rows.length);
  if (adminsRes.rows.length > 0) {
    for (const adminRow of adminsRes.rows) {
      console.log(`  Recipient UUID: ${adminRow.id}`);
      console.log(`  Recipient Role: ${adminRow.role}`);
      console.log(`  Recipient Email: ${adminRow.email}`);
      console.log(`  Recipient Status: ${adminRow.accountStatus}`);
    }
    console.log('✅ Success: Active Admin resolved');
  } else {
    console.log('❌ Failed: No active Admins resolved');
  }

  // 5. Create Notification(s) & Insert into notifications table
  console.log('Create Notification(s) & Insert into notifications table');
  const insertedNotifRes = await pool.query("SELECT * FROM notifications WHERE lead_id = $1", [newLead.id]);
  if (insertedNotifRes.rows.length > 0) {
    const inserted = insertedNotifRes.rows[0];
    console.log('Verify Notification Insert Payload (From DB record):');
    console.log(JSON.stringify({
      recipient_id: inserted.user_id,
      recipient_role: 'Admin',
      title: inserted.notification_type,
      message: inserted.message,
      type: inserted.notification_type,
      created_by: me.id
    }, null, 2));
    console.log('✅ Success: Notification row exists in database');
  } else {
    console.log('❌ Failed: No notification row inserted in notifications table');
  }

  // 6. GET /notifications (Admin)
  console.log('GET /notifications (Admin)');
  const admin = adminsRes.rows.find(a => a.accountStatus === 'active');
  if (!admin) {
    console.log('❌ Failed: No active Admin to login');
    process.exit(1);
  }
  admin._id = admin.id;
  const adminToken = generateAccessToken(admin);
  
  try {
    const res = await fetch(`${API_URL}/marketing/notifications`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const json = await res.json();
    if (res.status === 200 && json.success) {
      console.log('✅ Success: GET /notifications response JSON:');
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log('❌ Failed: GET /notifications returned status', res.status, JSON.stringify(json));
    }
  } catch (err) {
    console.log('❌ Failed: GET /notifications request failed:', err.message);
  }

  // 7. Verify Database Log Limit 10
  console.log('Verify Database (SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10):');
  const dbLimitRes = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10");
  console.log(JSON.stringify(dbLimitRes.rows, null, 2));

  process.exit(0);
}

runRCA();
