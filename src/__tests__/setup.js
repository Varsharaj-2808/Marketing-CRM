const ADMIN_USER = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  employee_id: 'EMP-00001',
  name: 'Admin User',
  email: 'admin@company.com',
  mobile: '1234567890',
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
  mobile: '0987654321',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
};

test('setup - test fixtures module', () => {
  expect(ADMIN_USER.role).toBe('Admin');
  expect(MARKETING_USER.role).toBe('Marketing Executive');
});

process.env.JWT_SECRET = "test-jwt-secret-for-testing";
const INACTIVE_USER = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  employee_id: 'EMP-00003',
  name: 'Inactive User',
  email: 'inactive@company.com',
  mobile: '1111111111',
  role: 'Marketing Executive',
  accountStatus: 'inactive',
  status: 'inactive',
  failedLoginAttempts: 0,
  lockoutUntil: null,
};

const LOCKED_USER = {
  id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  employee_id: 'EMP-00004',
  name: 'Locked User',
  email: 'locked@company.com',
  mobile: '2222222222',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 5,
  lockoutUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
};

const ALL_USERS = [ADMIN_USER, MARKETING_USER, INACTIVE_USER, LOCKED_USER];

module.exports = { ADMIN_USER, MARKETING_USER, INACTIVE_USER, LOCKED_USER, ALL_USERS };
