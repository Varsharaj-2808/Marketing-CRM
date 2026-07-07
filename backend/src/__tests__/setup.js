const ADMIN_USER = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  employee_id: 'EMP-00001',
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'Admin',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
};

const MARKETING_USER = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  employee_id: 'EMP-00002',
  name: 'John Doe',
  email: 'john@company.com',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
};

module.exports = { ADMIN_USER, MARKETING_USER };
