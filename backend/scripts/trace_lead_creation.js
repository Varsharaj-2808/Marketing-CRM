const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../src/config/db');
const leadController = require('../src/controllers/leadController');
const Notification = require('../src/models/Notification');

async function trace() {
  console.log('=== START TRACE ===');
  
  // 1. Resolve users
  const adminRes = await pool.query("SELECT * FROM users WHERE role = 'Admin' AND \"accountStatus\" = 'active' LIMIT 1");
  const meRes = await pool.query("SELECT * FROM users WHERE role = 'Marketing Executive' AND \"accountStatus\" = 'active' LIMIT 1");
  
  const admin = adminRes.rows[0];
  const me = meRes.rows[0];
  
  console.log(`Current User: ${me.name}`);
  console.log(`Current Role: ${me.role}`);
  console.log(`Current User UUID: ${me.id}`);
  
  // Get Category, SubCategory, Service
  const cat = (await pool.query("SELECT id FROM business_categories LIMIT 1")).rows[0]?.id;
  const subcat = (await pool.query("SELECT id FROM business_sub_categories LIMIT 1")).rows[0]?.id;
  const svc = (await pool.query("SELECT id FROM services LIMIT 1")).rows[0]?.id;

  const req = {
    body: {
      company_name: 'Trace Test Company LLC ' + Date.now(),
      contact_person: 'John Doe Trace',
      mobile_number: '9876543210',
      email: 'trace@test.com',
      lead_source: 'Website',
      priority: 'Hot',
      category: cat,
      sub_category: subcat,
      service_interested: [svc]
    },
    user: {
      id: me.id,
      role: me.role,
      name: me.name,
      email: me.email
    },
    headers: {},
    ip: '127.0.0.1'
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('API Request Result:', this.statusCode === 201 ? '✅ Success' : '❌ Failed', JSON.stringify(data));
      this.data = data;
    }
  };

  const next = (err) => {
    console.error('❌ Controller Error:', err);
  };

  // We want to intercept Notification.notifyAdmins to print resolution details
  const originalNotifyAdmins = Notification.notifyAdmins;
  Notification.notifyAdmins = async function(data) {
    console.log('Notification Service: Event Triggered');
    console.log('Recipient Resolution Details:');
    
    const admins = await pool.query("SELECT id, role, email, name, \"accountStatus\" FROM users WHERE role = 'Admin'");
    console.log('Query: SELECT id, role, email, name, "accountStatus" FROM users WHERE role = \'Admin\'');
    console.log('Query Result count:', admins.rows.length);
    for (const adminRow of admins.rows) {
      console.log(`  Recipient UUID: ${adminRow.id}`);
      console.log(`  Recipient Role: ${adminRow.role}`);
      console.log(`  Recipient Email: ${adminRow.email}`);
      console.log(`  Recipient Status: ${adminRow.accountStatus}`);
    }

    console.log('Verify Notification Insert Payload:');
    console.log(JSON.stringify({
      recipient_id: admins.rows[0]?.id,
      recipient_role: admins.rows[0]?.role,
      title: data.notificationType,
      message: data.message,
      type: data.notificationType,
      created_by: me.id
    }, null, 2));

    try {
      const res = await originalNotifyAdmins.call(this, data);
      console.log('✅ Notification inserted successfully');
      return res;
    } catch (insertErr) {
      console.log('❌ Database error:', insertErr.message);
      throw insertErr;
    }
  };

  // Run the controller action
  await leadController.createLead(req, res, next);
  
  // Wait a bit for async mail/notification dispatch (though it is async, let's wait to ensure logs are done)
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Query Database
  console.log('Verify Database:');
  const dbNotifs = await pool.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5");
  console.log(JSON.stringify(dbNotifs.rows, null, 2));

  // Mock API GET /notifications
  const notificationController = require('../src/controllers/notificationController');
  const notifReq = {
    user: {
      id: admin.id,
      role: admin.role
    }
  };
  const notifRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('Verify API Response (GET /notifications for Admin):');
      console.log(JSON.stringify(data, null, 2));
    }
  };
  await notificationController.getNotifications(notifReq, notifRes, next);

  process.exit(0);
}

trace();
