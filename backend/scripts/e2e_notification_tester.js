require('dotenv').config({ path: 'backend/.env' });

const { getClient } = require('./src/config/db');
const { generateAccessToken } = require('./src/utils/tokenUtils');

const API_URL = 'http://localhost:5000/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(JSON.stringify(data) || res.statusText);
  return data;
}

async function runTests() {
  console.log('--- Starting Notification E2E Verification ---');
  let adminToken, meToken;
  let adminId, meId;
  let categoryId, subCategoryId, serviceId;

  const client = await getClient();
  try {
    const { rows: admins } = await client.query(`SELECT * FROM users WHERE role = 'Admin' LIMIT 1`);
    adminId = admins[0].id; admins[0]._id = adminId; adminToken = generateAccessToken(admins[0]);
    
    const { rows: mes } = await client.query(`SELECT * FROM users WHERE role = 'Marketing Executive' LIMIT 1`);
    meId = mes[0].id; mes[0]._id = meId; meToken = generateAccessToken(mes[0]);
    
    categoryId = (await client.query('SELECT id FROM business_categories LIMIT 1')).rows[0]?.id;
    subCategoryId = (await client.query('SELECT id FROM business_sub_categories LIMIT 1')).rows[0]?.id;
    serviceId = (await client.query('SELECT id FROM services LIMIT 1')).rows[0]?.id;
  } finally {
    client.release();
  }

  try {
    console.log('\n[Scenario 1] Lead Creation...');
    const createLeadRes = await fetchJSON(`${API_URL}/marketing/leads`, {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'E2E Notification Test Company',
        contact_person: 'John Doe',
        mobile_number: '9876543210',
        email: 'test@e2e.com',
        lead_source: 'Website',
        priority: 'Hot',
        category: categoryId,
        sub_category: subCategoryId,
        service: serviceId,
        country: 'India',
        state: 'Tamil Nadu',
        city: 'Chennai',
        address: '123 Test St'
      }),
      headers: { Authorization: `Bearer ${meToken}` }
    });
    const newLead = createLeadRes.data;
    console.log(`? Lead Created: ${newLead.id}`);

    await new Promise(r => setTimeout(r, 1500));

    const client = await getClient();
    try {
      const { rows } = await client.query(`SELECT * FROM notifications WHERE notification_type = 'Lead Created' ORDER BY created_at DESC LIMIT 1`);
      if (rows.length > 0 && rows[0].message.includes('E2E Notification Test Company')) {
        console.log('? In-App Notification stored in DB for Admin.');
      } else {
        console.error('? Notification not found in DB! Expected Admin notification for lead creation.');
      }
    } finally {
      client.release();
    }

    console.log('\n[Scenario 2] Lead Assignment...');
    await fetchJSON(`${API_URL}/admin/leads/${newLead.id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assigned_to: meId }),
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('? Lead Assigned to ME.');
    await new Promise(r => setTimeout(r, 1500));
    
    const client2 = await getClient();
    try {
      const { rows } = await client2.query(`SELECT * FROM notifications WHERE notification_type = 'Lead Assigned' AND user_id = $1 ORDER BY created_at DESC LIMIT 1`, [meId]);
      if (rows.length > 0) {
         console.log('? In-App Notification stored in DB for ME.');
      } else {
         console.error('? Notification not found in DB! Expected ME notification for assignment.');
      }
    } finally {
      client2.release();
    }

    console.log('\n[Scenario 3] Status/Stage Update...');
    await fetchJSON(`${API_URL}/marketing/leads/${newLead.id}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage: 'Contacted' }),
      headers: { Authorization: `Bearer ${meToken}` }
    });
    console.log('? Lead Stage Updated to Contacted.');
    await new Promise(r => setTimeout(r, 1500));

    const client3 = await getClient();
    try {
      const { rows } = await client3.query(`SELECT * FROM notifications WHERE notification_type = 'Stage Update' ORDER BY created_at DESC LIMIT 1`);
      if (rows.length > 0 && rows[0].message.includes('Contacted')) {
         console.log('? In-App Notification stored in DB for Admin regarding Stage Update.');
      } else {
         console.error('? Notification not found in DB! Expected Admin notification for Stage Update.');
      }
    } finally {
      client3.release();
    }
    
    console.log('\n[API Verification] Checking Notification APIs...');
    const notifs = await fetchJSON(`${API_URL}/admin/notifications`, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log(`? Admin has ${notifs.data.length} notifications. Unread count: ${notifs.unreadCount}`);
    
    if (notifs.data.length > 0) {
       const notifId = notifs.data[0].id;
       await fetchJSON(`${API_URL}/admin/notifications/${notifId}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } });
       console.log(`? Marked single notification as read.`);
       
       await fetchJSON(`${API_URL}/admin/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${adminToken}` } });
       console.log(`? Marked all notifications as read.`);
    }
    
    const notifsME = await fetchJSON(`${API_URL}/marketing/notifications`, { headers: { Authorization: `Bearer ${meToken}` } });
    console.log(`? ME has ${notifsME.data.length} notifications. Unread count: ${notifsME.unreadCount}`);

    console.log('\n?? All E2E Notification tests executed successfully. Check the terminal running the backend for actual SMTP Gmail delivery logs!');
  } catch (err) {
    console.error('? Error during E2E test:', err.message);
  }
}

runTests();
