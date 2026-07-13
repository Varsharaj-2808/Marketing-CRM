const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER, INACTIVE_USER, LOCKED_USER, ALL_USERS,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));
jest.mock('../utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
}));
jest.mock('../utils/algoliaService', () => ({
  saveUser: jest.fn().mockResolvedValue(),
  deleteUser: jest.fn().mockResolvedValue(),
  searchUsers: jest.fn(),
  indexAllUsers: jest.fn().mockResolvedValue(),
  testConnection: jest.fn(),
}));

const createTestApp = () => {
  const app = express();
  app.use(require('helmet')());
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/admin', require('../routes/admin'));
  app.use(require('../middleware/errorHandler'));
  return app;
};

const adminToken = jwt.sign(
  { id: ADMIN_USER.id, email: ADMIN_USER.email, role: ADMIN_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);
const marketingToken = jwt.sign(
  { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);

const mockQueryFor = (handlers) => {
  mockQuery.mockImplementation((sql, params) => {
    for (const [pattern, handler] of handlers) {
      if (sql.includes(pattern)) return handler(sql, params);
    }
    return { rows: [] };
  });
};

const authHandlers = (user) => [
  ['SELECT NOW()', () => ({ rows: [{ now: new Date().toISOString() }] })],
  ['WHERE id = $1', () => ({ rows: [user] })],
  ['SELECT value FROM system_settings', () => ({ rows: [] })],
];

const defaultQuery = (handlers) => {
  mockQuery.mockImplementation((sql, params) => {
    for (const [pattern, handler] of handlers) {
      if (sql.includes(pattern)) return handler(sql, params);
    }
    return { rows: [] };
  });
};

beforeEach(() => {
  mockQuery.mockReset();
});

afterAll(() => jest.restoreAllMocks());

// ============================================================
// 2.1 Create User (Positive) — USER-001 to USER-010
// ============================================================
describe('2.1 Create User (Positive) — USER-001 to USER-010', () => {
  const createUserHandlers = (overrides = {}) => [
    ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ['SELECT value FROM system_settings', () => ({ rows: [] })],
    ['COALESCE(', () => ({ rows: [{ next_seq: overrides.nextSeq || 5 }] })],
    ['SELECT id FROM users WHERE email =', () => ({ rows: [] })],
    ['SELECT id FROM users WHERE mobile =', () => ({ rows: [] })],
    ['INSERT INTO users', () => ({
      rows: [{
        id: 'new-uuid', employee_id: overrides.employeeId || `EMP-${String(overrides.nextSeq || 5).padStart(5, '0')}`,
        name: overrides.name || 'John Doe', email: overrides.email || 'john@company.com',
        mobile: overrides.mobile || '9876543210', role: overrides.role || 'Marketing Executive',
        status: overrides.status || 'active',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }],
    })],
    ['INSERT INTO audit_logs', () => ({ rows: [] })],
  ];

  test('USER-001: Admin creates Marketing Executive', async () => {
    defaultQuery(createUserHandlers());
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'John Doe', email: 'john@company.com', mobile: '9876543210', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('John Doe');
    expect(res.body.data.role).toBe('Marketing Executive');
    expect(res.body.data.employee_id).toMatch(/^EMP-\d{5}$/);
    expect(res.body.data).not.toHaveProperty('tempPassword');
    expect(res.body.data).not.toHaveProperty('password');
  });

  test('USER-002: Admin creates Admin user', async () => {
    defaultQuery(createUserHandlers({ nextSeq: 6, employeeId: 'EMP-00007', role: 'Admin' }));
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Jane Smith', email: 'jane@company.com', mobile: '9123456789', role: 'Admin', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('Admin');
  });

  test('USER-003: Employee ID auto-generation format EMP-XXXXX', async () => {
    defaultQuery(createUserHandlers({ nextSeq: 5 }));
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test User', email: 'test@company.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.data.employee_id).toMatch(/^EMP-\d{5}$/);
  });

  test('USER-004: tempPassword not in response body', async () => {
    defaultQuery(createUserHandlers({ nextSeq: 7 }));
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', email: 'test2@company.com', mobile: '9222222222', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('tempPassword');
  });

  test('USER-005: Welcome email sent', async () => {
    const { sendWelcomeEmail } = require('../utils/emailService');
    sendWelcomeEmail.mockClear();
    defaultQuery(createUserHandlers({ nextSeq: 8, name: 'Email Test', email: 'emailtest@company.com' }));
    const app = createTestApp();
    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Email Test', email: 'emailtest@company.com', mobile: '9333333333', role: 'Marketing Executive', status: 'Active' });
    expect(sendWelcomeEmail).toHaveBeenCalled();
    expect(sendWelcomeEmail.mock.calls[0][0]).toBe('emailtest@company.com');
    expect(sendWelcomeEmail.mock.calls[0][2]).toMatch(/^EMP-/);
  });

  test('USER-006: New user can log in with temp credentials', async () => {
    const bcrypt = require('bcryptjs');
    const hashedPw = await bcrypt.hash('TempP@ss123!', 12);
    defaultQuery([
      ['WHERE email =', () => ({ rows: [{ ...MARKETING_USER, password: hashedPw, lastLoginAt: null }] })],
      ['UPDATE users SET', () => ({ rows: [MARKETING_USER] })],
      ['SELECT value FROM system_settings', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: MARKETING_USER.email, password: 'TempP@ss123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('USER-007: Various mobile formats accepted', async () => {
    for (let i = 0; i < 3; i++) {
      defaultQuery(createUserHandlers({ nextSeq: 9 + i, employeeId: `EMP-${9 + i}` }));
      const app = createTestApp();
      const mobiles = ['+91-98765-43210', '(+91) 9876543210', '9876543210'];
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Format ${i}`, email: `fmt${i}@c.com`, mobile: mobiles[i], role: 'Marketing Executive', status: 'Active' });
      expect(res.status).toBe(201);
    }
  });

  test('USER-008: Create user with status Inactive', async () => {
    defaultQuery(createUserHandlers({ nextSeq: 10, status: 'inactive' }));
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Inactive Test', email: 'inact@c.com', mobile: '9444444444', role: 'Marketing Executive', status: 'Inactive' });
    expect(res.status).toBe(201);
  });

  test('USER-009: 100-char name boundary', async () => {
    defaultQuery(createUserHandlers({ nextSeq: 11 }));
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A'.repeat(100), email: 'bound@c.com', mobile: '9555555555', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
  });

  test('USER-010: 254-char email boundary', async () => {
    defaultQuery(createUserHandlers({ nextSeq: 12 }));
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', email: `${'a'.repeat(243)}@c.com`, mobile: '9666666666', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
  });
});

// ============================================================
// 2.2 Create User (Negative) — USER-011 to USER-026
// ============================================================
describe('2.2 Create User (Negative) — USER-011 to USER-026', () => {
  const app = createTestApp();

  test('USER-011: Duplicate email — 409', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT id FROM users WHERE email =', () => ({ rows: [{ id: 'other' }] })],
    ]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: ADMIN_USER.email, mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  test('USER-012: Duplicate mobile — 409', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT id FROM users WHERE email =', () => ({ rows: [] })],
      ['SELECT id FROM users WHERE mobile =', () => ({ rows: [{ id: 'other' }] })],
    ]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 'uniq@c.com', mobile: ADMIN_USER.mobile, role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/mobile/i);
  });

  test('USER-013: Empty name — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-014: Empty mobile — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 't@c.com', mobile: '', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-015: Empty email — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: '', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-016: Invalid email format — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 'not-an-email', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-017: Invalid role — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 't@c.com', mobile: '9111111111', role: 'Sales Manager', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-018: Invalid status — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Pending' });
    expect(res.status).toBe(400);
  });

  test('USER-019: Name over 100 chars — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A'.repeat(101), email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-020: Email over 255 chars — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: `${'a'.repeat(250)}@c.com`, mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-021: XSS in name sanitized', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT value FROM system_settings', () => ({ rows: [] })],
      ['COALESCE(', () => ({ rows: [{ next_seq: 1 }] })],
      ['SELECT id FROM users WHERE email =', () => ({ rows: [] })],
      ['SELECT id FROM users WHERE mobile =', () => ({ rows: [] })],
      ['INSERT INTO users', () => ({ rows: [{ employee_id: 'EMP-00014', name: 'alert(xss)' }] })],
    ]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: "<script>alert('xss')</script>", email: 'xss@c.com', mobile: '9777777777', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).not.toContain('<');
  });

  test('USER-022: SQL injection payload rejected (invalid email)', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: "t'; DROP TABLE users; --@c.com", mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-023: Marketing cannot create — 403', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ name: 'T', email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(403);
  });

  test('USER-024: Unauthenticated — 401', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .send({ name: 'T', email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(401);
  });

  test('USER-025: Missing role — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 't@c.com', mobile: '9111111111', status: 'Active' });
    expect(res.status).toBe(400);
  });

  test('USER-026: Missing status — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'T', email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 2.3 Edit User — USER-027 to USER-034
// ============================================================
describe('2.3 Edit User — USER-027 to USER-034', () => {
  const app = createTestApp();

  test('USER-027: Admin edits name and mobile — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['UPDATE users SET', () => ({ rows: [{ ...MARKETING_USER, name: 'Updated', mobile: '9999999999' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated', mobile: '9999999999' });
    expect(res.status).toBe(200);
  });

  test('USER-028: Role change Marketing → Admin — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['UPDATE users SET', () => ({ rows: [{ ...MARKETING_USER, role: 'Admin' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'Admin' });
    expect(res.status).toBe(200);
  });

  test('USER-029: Role change takes effect on re-login', async () => {
    const bcrypt = require('bcryptjs');
    const hashedPw = await bcrypt.hash('Test@123', 12);
    defaultQuery([
      ['WHERE email =', () => ({ rows: [{ ...MARKETING_USER, role: 'Admin', password: hashedPw }] })],
      ['UPDATE users SET', () => ({ rows: [{ ...MARKETING_USER, role: 'Admin' }] })],
      ['SELECT value FROM system_settings', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: MARKETING_USER.email, password: 'Test@123' });
    expect(res.status).toBe(200);
    expect(jwt.decode(res.body.token).role).toBe('Admin');
  });

  test('USER-030: Duplicate email on edit — 409', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['SELECT id FROM users WHERE email', () => ({ rows: [{ id: 'other' }] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: ADMIN_USER.email });
    expect(res.status).toBe(409);
  });

  test('USER-031: Duplicate mobile on edit — 409', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['SELECT id FROM users WHERE email', () => ({ rows: [] })],
      ['SELECT id FROM users WHERE mobile', () => ({ rows: [{ id: 'other' }] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ mobile: ADMIN_USER.mobile });
    expect(res.status).toBe(409);
  });

  test('USER-032: employee_id immutable (silently ignored)', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['UPDATE users SET', () => ({ rows: [{ ...MARKETING_USER }] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employee_id: 'EMP-99999' });
    // No changes detected → 400
    expect(res.status).toBe(400);
  });

  test('USER-033: Marketing cannot edit — 403', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  test('USER-034: Edit non-existent user — 404', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nobody' });
    expect(res.status).toBe(404);
  });
});

// ============================================================
// 2.4 Deactivate / Reactivate — USER-035 to USER-040
// ============================================================
describe('2.4 Deactivate User — USER-035 to USER-040', () => {
  const app = createTestApp();

  test('USER-035: Admin deactivates active user — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['UPDATE users SET "accountStatus"', () => ({ rows: [{ ...MARKETING_USER, accountStatus: 'inactive' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .patch('/api/admin/users/EMP-00002/deactivate')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('USER-036: Deactivated user cannot log in — 403', async () => {
    defaultQuery([
      ['WHERE email =', () => ({ rows: [{ ...INACTIVE_USER, password: 'x' }] })],
      ['SELECT value FROM system_settings', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: INACTIVE_USER.email, password: 'AnyPass123!' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/inactive/i);
  });

  test('USER-038: Admin reactivates deactivated user — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...INACTIVE_USER }] })],
      ['UPDATE users SET "accountStatus"', () => ({ rows: [{ ...INACTIVE_USER, accountStatus: 'active' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .patch('/api/admin/users/EMP-00003/activate')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('USER-040: Hard delete returns 403', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const res = await request(app)
      .delete('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

// ============================================================
// 2.5 Role Change & Permission — USER-041 to USER-043
// ============================================================
describe('2.5 Role Change & Permission — USER-041 to USER-043', () => {
  const app = createTestApp();

  test('USER-041: Re-login after role change grants Admin access', async () => {
    const bcrypt = require('bcryptjs');
    const hashedPw = await bcrypt.hash('Test@123', 12);
    defaultQuery([
      ['WHERE email =', () => ({ rows: [{ ...MARKETING_USER, role: 'Admin', password: hashedPw }] })],
      ['UPDATE users SET', () => ({ rows: [{ ...MARKETING_USER, role: 'Admin' }] })],
      ['SELECT value FROM system_settings', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: MARKETING_USER.email, password: 'Test@123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('Admin');
  });

  test('USER-043: Old JWT retains old role until re-login', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const oldToken = jwt.sign(
      { id: MARKETING_USER.id, email: MARKETING_USER.email, role: 'Marketing Executive' },
      process.env.JWT_SECRET, { expiresIn: '15m' }
    );
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(res.status).toBe(403);
  });
});

// ============================================================
// 2.6 Access Control & Authorization — USER-044 to USER-052
// ============================================================
describe('2.6 Access Control — USER-044 to USER-052', () => {
  const app = createTestApp();

  test('USER-044: Marketing cannot access admin users list — 403', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
  });

  test('USER-046: Admin can view all users — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT id, "employee_id", name', () => ({ rows: ALL_USERS })],
    ]);
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('USER-047: Admin can view specific user — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
    ]);
    const res = await request(app)
      .get('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('USER-048: Marketing can view own profile — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
    ]);
    const res = await request(app)
      .get('/api/admin/users/me')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
  });

  test('USER-049: Marketing cannot view all users — 403', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
  });

  test('USER-050: Unauthenticated — 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  test('USER-051: Password hash excluded from response', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...ADMIN_USER, password: '$2a$12$hash' }] })],
    ]);
    const res = await request(app)
      .get('/api/admin/users/EMP-00001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data).not.toHaveProperty('refreshToken');
  });

  test('USER-052: RBAC enforced on all endpoints', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const endpoints = [
      ['post', '/api/admin/users', { name: 'T', email: 't@c.com', mobile: '9111111111', role: 'Marketing Executive', status: 'Active' }],
      ['put', '/api/admin/users/EMP-00002', { name: 'T' }],
      ['delete', '/api/admin/users/EMP-00002'],
      ['patch', '/api/admin/users/EMP-00002/deactivate'],
      ['patch', '/api/admin/users/EMP-00002/activate'],
    ];
    for (const [method, url, body] of endpoints) {
      const req = request(app)[method](url).set('Authorization', `Bearer ${marketingToken}`);
      if (body) req.send(body);
      const res = await req;
      expect(res.status).toBe(403);
    }
  });
});

// ============================================================
// 2.7 Audit Log — USER-053 to USER-058
// ============================================================
describe('2.7 Audit Log — USER-053 to USER-058', () => {
  const app = createTestApp();

  test('USER-053: Audit log created on user creation', async () => {
    let auditCalled = false;
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COALESCE(', () => ({ rows: [{ next_seq: 1 }] })],
      ['SELECT id FROM users WHERE email =', () => ({ rows: [] })],
      ['SELECT id FROM users WHERE mobile =', () => ({ rows: [] })],
      ['INSERT INTO users', () => ({ rows: [{ employee_id: 'EMP-00015' }] })],
      ['INSERT INTO audit_logs', () => { auditCalled = true; return { rows: [] }; }],
    ]);
    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit Test', email: 'audit@c.com', mobile: '9888888888', role: 'Marketing Executive', status: 'Active' });
    expect(auditCalled).toBe(true);
  });

  test('USER-054: Audit log on user update', async () => {
    let auditCalled = false;
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
      ['UPDATE users SET', () => ({ rows: [{ ...MARKETING_USER, name: 'Updated' }] })],
      ['INSERT INTO audit_logs', () => { auditCalled = true; return { rows: [] }; }],
    ]);
    await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated' });
    expect(auditCalled).toBe(true);
  });

  test('USER-057: No password in audit log details', async () => {
    let auditDetails = null;
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COALESCE(', () => ({ rows: [{ next_seq: 1 }] })],
      ['SELECT id FROM users WHERE email =', () => ({ rows: [] })],
      ['SELECT id FROM users WHERE mobile =', () => ({ rows: [] })],
      ['INSERT INTO users', () => ({ rows: [{ employee_id: 'EMP-00016', name: 'NoPw' }] })],
      ['INSERT INTO audit_logs', (sql, p) => { auditDetails = p[5]; return { rows: [] }; }],
    ]);
    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NoPw', email: 'nopw@c.com', mobile: '9777777777', role: 'Marketing Executive', status: 'Active' });
    const parsed = JSON.parse(auditDetails);
    expect(parsed).not.toHaveProperty('password');
    expect(parsed).not.toHaveProperty('tempPassword');
  });
});

// ============================================================
// 2.8 Business Rules — USER-059 to USER-066
// ============================================================
describe('2.8 Business Rules — USER-059 to USER-066', () => {
  const app = createTestApp();

  test('USER-059: Employee ID format EMP-XXXXX', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COALESCE(', () => ({ rows: [{ next_seq: 101 }] })],
      ['SELECT id FROM users WHERE email =', () => ({ rows: [] })],
      ['SELECT id FROM users WHERE mobile =', () => ({ rows: [] })],
      ['INSERT INTO users', () => ({ rows: [{ employee_id: 'EMP-00102' }] })],
    ]);
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'ID Test', email: 'id@c.com', mobile: '9666666666', role: 'Marketing Executive', status: 'Active' });
    expect(res.status).toBe(201);
    expect(res.body.data.employee_id).toMatch(/^EMP-\d{5}$/);
  });

  test('USER-060: employee_id immutable (no changes = 400)', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE "employee_id" = $1', () => ({ rows: [{ ...MARKETING_USER }] })],
    ]);
    const res = await request(app)
      .put('/api/admin/users/EMP-00002')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employee_id: 'EMP-99999' });
    expect(res.status).toBe(400);
  });

  test('USER-064: System settings API', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['INSERT INTO system_settings', () => ({ rows: [{ key: 'LOCKOUT_THRESHOLD', value: '3' }] })],
    ]);
    const res = await request(app)
      .put('/api/admin/settings/LOCKOUT_THRESHOLD')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: '3' });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe('3');
  });

  test('USER-065: Password complexity', () => {
    const { generateTempPassword } = require('../utils/passwordUtils');
    for (let i = 0; i < 10; i++) {
      const pw = generateTempPassword();
      expect(pw.length).toBeGreaterThanOrEqual(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
    }
  });
});

// ============================================================
// 2.9 Audit Log API — USER-061 to USER-066 (re-purposed)
// ============================================================
describe('2.9 Audit Log API', () => {
  const app = createTestApp();

  const MOCK_LOGS = [
    { id: 'a1', user_id: ADMIN_USER.id, email: ADMIN_USER.email, action: 'USER_CREATED', resource: 'User', resourceId: 'EMP-00005', details: '{"name":"John"}', ipAddress: '::1', userAgent: 'supertest', result: 'Success', createdAt: '2026-06-28T10:00:00.000Z' },
    { id: 'a2', user_id: ADMIN_USER.id, email: ADMIN_USER.email, action: 'LOGIN_SUCCESS', resource: 'Auth', resourceId: '', details: 'Successful login', ipAddress: '::1', userAgent: 'supertest', result: 'Success', createdAt: '2026-06-28T09:00:00.000Z' },
  ];

  test('USER-061: Admin can list audit logs — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '2' }] })],
      ['ORDER BY "createdAt"', () => ({ rows: MOCK_LOGS })],
    ]);
    const res = await request(app)
      .get('/api/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toBeDefined();
  });

  test('USER-062: Admin can filter audit logs by action', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['ORDER BY "createdAt"', () => ({ rows: [MOCK_LOGS[0]] })],
    ]);
    const res = await request(app)
      .get('/api/admin/audit-log?action=USER_CREATED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].action).toBe('USER_CREATED');
  });

  test('USER-063: Marketing cannot list audit logs — 403', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const res = await request(app)
      .get('/api/admin/audit-log')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
  });

  test('USER-064: Unauthenticated — 401', async () => {
    const res = await request(app).get('/api/admin/audit-log');
    expect(res.status).toBe(401);
  });

  test('USER-065: Admin can view specific audit log — 200', async () => {
    defaultQuery([
      ['audit_logs WHERE id =', () => ({ rows: [MOCK_LOGS[0]] })],
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ]);
    const res = await request(app)
      .get('/api/admin/audit-log/a1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('a1');
  });

  test('USER-066: View non-existent audit log — 404', async () => {
    defaultQuery([
      ['audit_logs WHERE id =', () => ({ rows: [] })],
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
    ]);
    const res = await request(app)
      .get('/api/admin/audit-log/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ============================================================
// 2.10 Refresh Token — Expiry & Remember Me
// ============================================================
describe('2.10 Refresh Token', () => {
  const app = createTestApp();

  test('USER-067: Remember Me refresh token expired after 30d + 1s — 401', async () => {
    const expiredRefreshToken = jwt.sign(
      { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: expiredRefreshToken });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  test('USER-068: Valid refresh token returns new tokens — 200', async () => {
    const bcrypt = require('bcryptjs');
    const validRefreshToken = jwt.sign(
      { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    const hashedRefresh = await bcrypt.hash(validRefreshToken, 12);
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [{ ...MARKETING_USER, refreshToken: hashedRefresh }] })],
      ['UPDATE users SET "refreshToken"', () => ({ rows: [] })],
    ]);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('USER-069: No refresh token in body — 400', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ============================================================
// Cross-Cutting Security
// ============================================================
describe('Cross-Cutting Security', () => {
  describe('SEC-004: Rate limiting on login', () => {
    test('returns 429 after 20+ rapid requests', async () => {
      defaultQuery([['SELECT value FROM system_settings', () => ({ rows: [] })]]);
      const app = createTestApp();
      const results = await Promise.all(
        Array.from({ length: 25 }, () =>
          request(app).post('/api/auth/login').send({ email: 't@t.com', password: 'wrong' })
        )
      );
      expect(results.filter(r => r.status === 429).length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('SEC-008: Security headers', () => {
    test('X-Content-Type-Options and X-Frame-Options present', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });
});
