process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.JWT_REFRESH_EXPIRES_IN_REMEMBER = '30d';
process.env.LOCKOUT_THRESHOLD = '5';
process.env.LOCKOUT_WINDOW_MINUTES = '15';
process.env.RESET_TOKEN_EXPIRY_MINUTES = '30';
process.env.APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

const jwt = require('jsonwebtoken');

const ADMIN_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  employee_id: 'EMP-00001',
  name: 'Admin User',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@company.com',
  mobile: '9999999999',
  role: 'Admin',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
  lastLoginAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const MARKETING_USER = {
  id: '22222222-2222-2222-2222-222222222222',
  employee_id: 'EMP-00002',
  name: 'Marketing User',
  firstName: 'Marketing',
  lastName: 'User',
  email: 'marketing@company.com',
  mobile: '8888888888',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
  lastLoginAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const INACTIVE_USER = {
  id: '33333333-3333-3333-3333-333333333333',
  employee_id: 'EMP-00003',
  name: 'Inactive User',
  firstName: 'Inactive',
  lastName: 'User',
  email: 'inactive@company.com',
  mobile: '7777777777',
  role: 'Marketing Executive',
  accountStatus: 'inactive',
  status: 'inactive',
  failedLoginAttempts: 0,
  lockoutUntil: null,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const LOCKED_USER = {
  id: '44444444-4444-4444-4444-444444444444',
  employee_id: 'EMP-00004',
  name: 'Locked User',
  firstName: 'Locked',
  lastName: 'User',
  email: 'locked@company.com',
  mobile: '6666666666',
  role: 'Marketing Executive',
  accountStatus: 'locked',
  status: 'locked',
  failedLoginAttempts: 5,
  lockoutUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const ALL_USERS = [ADMIN_USER, MARKETING_USER, INACTIVE_USER, LOCKED_USER];

const generateToken = (user = ADMIN_USER) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const buildReq = (user = ADMIN_USER) => ({
  headers: { authorization: `Bearer ${generateToken(user)}` },
});

module.exports = {
  ADMIN_USER,
  MARKETING_USER,
  INACTIVE_USER,
  LOCKED_USER,
  ALL_USERS,
  generateToken,
  buildReq,
};
