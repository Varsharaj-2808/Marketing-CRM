require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendAdminLeadCreatedEmail } = require('../src/utils/emailService');

async function testSend() {
  console.log('Sending test email to admin@company.com...');
  const res = await sendAdminLeadCreatedEmail('admin@company.com', 'Admin User', 'Joh1n', {
    id: '08e5cf22-f16f-4c7c-b9a8-95143009a3f4',
    company_name: 'Test Company',
    contact_person: 'John',
    mobile_number: '9876543210',
    priority: 'Hot'
  });
  console.log('Result:', JSON.stringify(res, null, 2));
  process.exit(0);
}
testSend();
