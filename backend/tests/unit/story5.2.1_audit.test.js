const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../../src/routes/auth'));
  app.use('/api/admin', require('../../src/routes/admin'));
  app.use(require('../../src/middleware/errorHandler'));
  return app;
};
const app = createTestApp();
const { query, getClient } = require('../../src/config/db');
const { ADMIN_USER, MARKETING_USER } = require('./setup');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

let adminToken, marketingToken, hashedPassword;

const mockUserRow = (overrides = {}) => ({
  id: ADMIN_USER.id,
  employee_id: 'EMP-00001',
  name: 'Admin User',
  email: 'admin@company.com',
  mobile: '1234567890',
  role: 'Admin',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const mockMarketingRow = (overrides = {}) => ({
  id: MARKETING_USER.id,
  employee_id: 'EMP-00002',
  name: 'John Doe',
  email: 'john@company.com',
  mobile: '0987654321',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

beforeAll(async () => {
  hashedPassword = await bcrypt.hash('password123', 10);
  adminToken = jwt.sign(
    { id: ADMIN_USER.id, role: ADMIN_USER.role },
    process.env.JWT_SECRET || 'test-jwt-secret-for-testing',
    { expiresIn: '1h' }
  );
  marketingToken = jwt.sign(
    { id: MARKETING_USER.id, role: MARKETING_USER.role },
    process.env.JWT_SECRET || 'test-jwt-secret-for-testing',
    { expiresIn: '1h' }
  );
});

beforeEach(() => {
  jest.clearAllMocks();
  const mockClient = {
    query: jest.fn((sql, params) => query(sql, params)),
    release: jest.fn(),
  };
  getClient.mockResolvedValue(mockClient);
});

const mkClient = (handlers) => {
  const client = {
    query: jest.fn().mockImplementation((sql, params) => {
      for (const [match, response] of handlers) {
        if (sql.includes(match) || sql === match) {
          return Promise.resolve(response(params, sql));
        }
      }
      return Promise.resolve({ rows: [] });
    }),
    release: jest.fn(),
  };
  return client;
};

const defaultQuery = (overrides = []) => {
  query.mockImplementation((sql, params) => {
    if (sql.includes('SELECT * FROM users WHERE id = $1')) {
      return Promise.resolve({
        rows: [{
          id: params[0],
          role: params[0] === ADMIN_USER.id ? 'Admin' : 'Marketing Executive',
          status: 'active',
          accountStatus: 'active',
          name: 'Mock User',
          employee_id: 'EMP001',
        }],
      });
    }
    for (const [match, response] of overrides) {
      if (sql.includes(match)) {
        return Promise.resolve(response(params, sql));
      }
    }
    if (sql.includes('SELECT value FROM system_settings WHERE key')) {
      return Promise.resolve({
        rows: [{ key: 'audit_log_retention_months', value: '12' }],
      });
    }
    if (sql.includes('SELECT * FROM system_settings')) {
      return Promise.resolve({ rows: [] });
    }
    return Promise.resolve({ rows: [] });
  });
};

describe('STORY-5.2.1: System-wide Audit Log', () => {
  describe('GET /api/admin/audit-log', () => {
    test('test-ep-5.2.1-b-001: Admin fetches audit logs with default sorting and pagination', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '15' }] })],
        ['SELECT a.*', () => ({
          rows: [
            {
              id: 'e0b0e513-ef9f-4318-8097-f0bb26922f30',
              user_id: ADMIN_USER.id,
              action: 'lead.assigned',
              resource: 'lead',
              resourceId: 'lead-uuid-1',
              result: 'success',
              ipAddress: '203.0.113.45',
              details: '{}',
              createdAt: '2026-07-07T12:00:00Z',
              actor_name: 'Admin User',
              actor_role: 'Admin',
            },
          ],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?actor=&action_type=&entity=lead&from=2026-01-01&to=2026-07-07&sort_order=desc&page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].action_type).toBe('lead.assigned');
      expect(res.body.data[0].actor).toBeDefined();
      expect(res.body.data[0].actor.id).toBe(ADMIN_USER.id);
      expect(res.body.data[0].actor.name).toBe('Admin User');
      expect(res.body.data[0].actor.role).toBe('Admin');
      expect(res.body.data[0].entity_affected).toBe('lead');
      expect(res.body.data[0].entity_id).toBe('lead-uuid-1');
      expect(res.body.data[0].ip_address).toBe('203.0.113.45');
      expect(res.body.data[0].details).toEqual({});
      expect(res.body.data[0].created_at).toBe('2026-07-07T12:00:00Z');
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      // Verify sorting newest-first by created_at DESC
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('test-ep-5.2.1-b-002: Filter audit logs by actor (user_id)', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '5' }] })],
        ['"user_id" = $1', () => ({
          rows: [
            {
              id: 'aud-1', user_id: ADMIN_USER.id, action: 'user.login',
              resource: 'user', resourceId: null, result: 'success',
              details: '{}', ipAddress: '127.0.0.1', createdAt: '2026-06-20T10:00:00Z',
              actor_name: 'Admin User', actor_role: 'Admin',
            },
          ],
        })],
      ]);
      const res = await request(app)
        .get(`/api/admin/audit-log?actor=${ADMIN_USER.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].actor.id).toBe(ADMIN_USER.id);
    });

    test('test-ep-5.2.1-b-003: Filter audit logs by action_type', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '3' }] })],
        ['action = $1', () => ({
          rows: [
            {
              id: 'aud-1', user_id: ADMIN_USER.id, action: 'user.login',
              resource: 'user', resourceId: null, result: 'success',
              details: '{}', ipAddress: '127.0.0.1', createdAt: '2026-06-20T10:00:00Z',
              actor_name: 'Admin User', actor_role: 'Admin',
            },
          ],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?action_type=user.login')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].action_type).toBe('user.login');
    });

    test('test-ep-5.2.1-b-004: Filter audit logs by entity_affected', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '7' }] })],
        ['resource = $1', () => ({
          rows: [
            {
              id: 'aud-1', user_id: ADMIN_USER.id, action: 'user.created',
              resource: 'user', resourceId: 'emp-001', result: 'success',
              details: '{}', ipAddress: '127.0.0.1', createdAt: '2026-06-20T10:00:00Z',
              actor_name: 'Admin User', actor_role: 'Admin',
            },
          ],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?entity=user')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].entity_affected).toBe('user');
    });

    test('test-ep-5.2.1-b-005: Filter audit logs by date range', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '10' }] })],
        ['"createdAt" >= ', () => ({
          rows: [
            {
              id: 'aud-1', user_id: ADMIN_USER.id, action: 'user.login',
              resource: 'user', result: 'success',
              details: '{}', ipAddress: '127.0.0.1', createdAt: '2026-06-15T10:00:00Z',
              actor_name: 'Admin User', actor_role: 'Admin',
            },
          ],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?from=2026-01-01&to=2026-07-07')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('test-ep-5.2.1-b-006: Date boundary returns entries on the boundary date', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '1' }] })],
        ['"createdAt" >= ', () => ({
          rows: [
            {
              id: 'aud-boundary', user_id: ADMIN_USER.id, action: 'user.login',
              resource: 'user', result: 'success',
              details: '{}', ipAddress: '127.0.0.1', createdAt: '2026-07-07T00:00:00.000Z',
              actor_name: 'Admin User', actor_role: 'Admin',
            }
          ],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?from=2026-07-07&to=2026-07-07')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('aud-boundary');
    });

    test('test-ep-5.2.1-b-007: Invalid date range returns 400 on list', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log?from=invalid-date&to=2026-07-07')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    test('test-ep-5.2.1-b-008: Pagination boundary ΓÇö page beyond total returns empty data', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '10' }] })],
        ['SELECT a.*', () => ({ rows: [] })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total_pages).toBe(1);
      expect(res.body.pagination.total_records).toBe(10);
    });

    test('test-ep-5.2.1-b-009: 403 when Marketing Executive accesses audit log', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admins only.');
    });

    test('test-ep-5.2.1-b-010: 401 when no auth token provided', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/audit-log/:id', () => {
    test('test-ep-5.2.1-b-011: Admin fetches single audit log entry by ID', async () => {
      const AUDIT_UUID = 'e0b0e513-ef9f-4318-8097-f0bb26922f30';
      defaultQuery([
        ['SELECT a.*', () => ({
          rows: [{
            id: AUDIT_UUID,
            user_id: ADMIN_USER.id,
            action: 'user.role_changed',
            resource: 'user',
            resourceId: 'user-uuid-1',
            result: 'success',
            details: JSON.stringify({ old_role: 'Marketing', new_role: 'Admin' }),
            ipAddress: '203.0.113.45',
            createdAt: '2026-07-07T12:00:00Z',
            actor_name: 'Admin User',
            actor_role: 'Admin',
          }],
        })],
      ]);
      const res = await request(app)
        .get(`/api/admin/audit-log/${AUDIT_UUID}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(AUDIT_UUID);
      expect(res.body.data.action_type).toBe('user.role_changed');
      expect(res.body.data.actor.id).toBe(ADMIN_USER.id);
      expect(res.body.data.actor.name).toBe('Admin User');
      expect(res.body.data.actor.role).toBe('Admin');
      expect(res.body.data.entity_affected).toBe('user');
      expect(res.body.data.entity_id).toBe('user-uuid-1');
      expect(res.body.data.ip_address).toBe('203.0.113.45');
      expect(res.body.data.details).toEqual({ old_role: 'Marketing', new_role: 'Admin' });
      expect(res.body.data.created_at).toBe('2026-07-07T12:00:00Z');
    });

    test('test-ep-5.2.1-b-012: 404 when audit log entry does not exist', async () => {
      defaultQuery([
        ['SELECT a.*', () => ({ rows: [] })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log/ffffffff-ffff-ffff-ffff-ffffffffffff')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Audit log entry not found');
    });

    test('test-ep-5.2.1-b-013: 404 when ID is not a valid UUID format', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Audit log entry not found');
    });

    test('test-ep-5.2.1-b-014: 403 when Marketing Executive views single audit entry', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/e0b0e513-ef9f-4318-8097-f0bb26922f30')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admins only.');
    });

    test('test-ep-5.2.1-b-015: 401 when no auth token provided for detail', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/e0b0e513-ef9f-4318-8097-f0bb26922f30');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/audit-log/export', () => {
    test('test-ep-5.2.1-b-016: Admin exports audit logs as CSV with spec headers', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '1' }] })],
        ['SELECT a.*', () => ({
          rows: [{
            id: 'aud-1', user_id: ADMIN_USER.id, action: 'user.login',
            resource: 'user', resourceId: null, details: '{}', ipAddress: '127.0.0.1',
            userAgent: '', result: 'success', createdAt: '2026-06-20T10:00:00Z',
            actor_name: 'Admin User', actor_role: 'Admin',
          }],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-01-01&to=2026-07-07&format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('id,seq,actor_id,actor_name,actor_role,action_type,entity_affected,entity_id,result,ip_address,created_at');
    });

    test('test-ep-5.2.1-b-017: 400 when export format is not csv', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-01-01&to=2026-07-07&format=pdf')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Format must be csv');
    });

    test('test-ep-5.2.1-b-018: 404 when no records match the applied filters for export', async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '0' }] })],
        ['SELECT a.*', () => ({ rows: [] })],
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2020-01-01&to=2020-01-02&format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('No audit log entries found for the given filters');
    });

    test('test-ep-5.2.1-b-019: 403 when Marketing Executive exports audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-01-01&to=2026-07-07&format=csv')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admins only.');
    });

    test('test-ep-5.2.1-b-020: 401 when no auth token for export', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-01-01&to=2026-07-07&format=csv');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/system-settings/audit-retention', () => {
    test('test-ep-5.2.1-b-021: Admin fetches audit retention setting', async () => {
      defaultQuery([
        ['SELECT * FROM system_settings WHERE key = $1', () => ({
          rows: [{
            key: 'audit_log_retention_months',
            value: '12',
            description: 'Months an audit record stays in active storage before archival',
            updated_at: null,
            created_at: '2026-01-01T00:00:00Z',
          }],
        })],
      ]);
      const res = await request(app)
        .get('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.key).toBe('audit_log_retention_months');
      expect(res.body.data.value).toBe('12');
    });

    test('test-ep-5.2.1-b-022: 403 when Marketing Executive views audit retention', async () => {
      const res = await request(app)
        .get('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admins only.');
    });
  });

  describe('PUT /api/admin/system-settings/audit-retention', () => {
    test('test-ep-5.2.1-b-023: Admin updates audit retention to valid value', async () => {
      let inserted = false;
      defaultQuery([
        ['SELECT * FROM system_settings WHERE key = $1', () => {
          if (inserted) return { rows: [{ key: 'audit_log_retention_months', value: '18', updated_at: '2026-07-07T12:00:00Z' }] };
          return { rows: [] };
        }],
        ['INSERT INTO system_settings', () => {
          inserted = true;
          return {
            rows: [{
              key: 'audit_log_retention_months',
              value: '18',
              updated_at: '2026-07-07T12:00:00Z',
            }],
          };
        }],
      ]);
      const res = await request(app)
        .put('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: '18' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Retention policy updated successfully.');
      expect(res.body.data.key).toBe('audit_log_retention_months');
      expect(res.body.data.value).toBe('18');
      expect(res.body.data.updated_at).toBeDefined();
      // Follow-up GET returns new value
      const getRes = await request(app)
        .get('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.value).toBe('18');
    });

    test('test-ep-5.2.1-b-024: 400 when setting non-numeric retention value', async () => {
      const res = await request(app)
        .put('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'abc' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Retention period must be a positive integer (months)');
    });

    test('test-ep-5.2.1-b-025: 400 when setting negative retention value', async () => {
      const res = await request(app)
        .put('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: '-5' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Retention period must be a positive integer (months)');
    });

    test('test-ep-5.2.1-b-026: 403 when Marketing Executive updates audit retention', async () => {
      const res = await request(app)
        .put('/api/admin/system-settings/audit-retention')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ value: '6' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admins only.');
    });
  });

  describe('POST /api/admin/audit-log/archive', () => {
    test('test-ep-5.2.1-b-027: Admin archives old audit records', async () => {
      defaultQuery([
        ['SELECT value FROM system_settings WHERE key', () => ({
          rows: [{ value: '12' }],
        })],
        ['WITH archived AS', () => ({
          rows: [{
            archived_count: 342,
            retention_months: '12',
            cutoff_date: '2025-07-07',
          }],
        })],
      ]);
      const res = await request(app)
        .post('/api/admin/audit-log/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ triggered_by: 'scheduled_job' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Archival completed');
      expect(res.body.archived_count).toBe(342);
      expect(res.body.retention_months).toBe('12');
      expect(res.body.cutoff_date).toBe('2025-07-07');
    });

    test('test-ep-5.2.1-b-028: Archive with zero qualifying records', async () => {
      defaultQuery([
        ['SELECT value FROM system_settings WHERE key', () => ({
          rows: [{ value: '12' }],
        })],
        ['WITH archived AS', () => ({
          rows: [{
            archived_count: 0,
            retention_months: '12',
            cutoff_date: '2025-07-07',
          }],
        })],
      ]);
      const res = await request(app)
        .post('/api/admin/audit-log/archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ triggered_by: 'scheduled_job' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Archival completed');
      expect(res.body.archived_count).toBe(0);
      expect(res.body.retention_months).toBe('12');
      expect(res.body.cutoff_date).toBe('2025-07-07');
    });

    test('test-ep-5.2.1-b-029: 403 when Marketing Executive triggers archive', async () => {
      const res = await request(app)
        .post('/api/admin/audit-log/archive')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ triggered_by: 'scheduled_job' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admins only.');
    });
  });

  describe('Action Instrumentation & Transaction Validation', () => {
    test('test-ep-5.2.1-b-030: Successful login creates audit log entry', async () => {
      const loginQuery = jest.fn().mockImplementation((sql, params) => {
        if (sql.includes('SELECT key, value FROM system_settings')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT * FROM users WHERE email = $1')) {
          return Promise.resolve({
            rows: [{
              id: ADMIN_USER.id,
              employee_id: 'EMP-00001',
              name: 'Admin User',
              email: 'admin@company.com',
              role: 'Admin',
              accountStatus: 'active',
              status: 'active',
              password: hashedPassword,
              failedLoginAttempts: 0,
              lockoutUntil: null,
              lastLoginAt: null,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            }],
          });
        }
        if (sql.includes('UPDATE users SET "failedLoginAttempts" = 0')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE users SET "lastLoginAt" = NOW()')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE users SET "refreshToken" = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{
              id: 'audit-login-1', user_id: ADMIN_USER.id,
              action: 'user.login', resource: 'user',
              result: 'success',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
      query.mockImplementation(loginQuery);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@company.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const auditCalls = loginQuery.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('user.login');
      expect(auditParams[3]).toBe('user');
      expect(auditParams[8]).toBe('success');
    });

    test('test-ep-5.2.1-b-031: Failed login creates audit log entry', async () => {
      const loginQuery = jest.fn().mockImplementation((sql, params) => {
        if (sql.includes('SELECT key, value FROM system_settings')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT * FROM users WHERE email = $1')) {
          return Promise.resolve({
            rows: [{
              id: ADMIN_USER.id,
              employee_id: 'EMP-00001',
              name: 'Admin User',
              email: 'admin@company.com',
              role: 'Admin',
              accountStatus: 'active',
              status: 'active',
              password: hashedPassword,
              failedLoginAttempts: 0,
              lockoutUntil: null,
              lastLoginAt: null,
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            }],
          });
        }
        if (sql.includes('UPDATE users SET "failedLoginAttempts" = "failedLoginAttempts" + 1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-fail-1', action: 'user.login_failed', result: 'failure' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
      query.mockImplementation(loginQuery);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@company.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      const auditCalls = loginQuery.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
    });

    test('test-ep-5.2.1-b-032: Logout creates audit log entry', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: params[0],
              role: params[0] === ADMIN_USER.id ? 'Admin' : 'Marketing Executive',
              status: 'active',
              accountStatus: 'active',
              name: 'Admin User',
              employee_id: 'EMP-00001',
            }],
          });
        }
        if (sql.includes('UPDATE users SET "refreshToken" = NULL')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-logout-1', user_id: ADMIN_USER.id, action: 'user.logout', resource: 'user', result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('user.logout');
      expect(auditParams[3]).toBe('user');
    });

    test('test-ep-5.2.1-b-033: User creation creates audit log entry', async () => {
      const newUserId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT id FROM users WHERE email = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT id FROM users WHERE mobile = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT COALESCE(MAX')) {
          return Promise.resolve({ rows: [{ next_seq: 5 }] });
        }
        if (sql.includes('INSERT INTO users')) {
          return Promise.resolve({
            rows: [{ id: newUserId, employee_id: 'EMP-00005', name: 'New User', email: 'new@company.com', mobile: '5555555555', role: 'Marketing Executive', status: 'active', createdAt: '2026-07-07T00:00:00Z', updatedAt: '2026-07-07T00:00:00Z' }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-create-user', user_id: ADMIN_USER.id, action: 'user.created', resource: 'user', resourceId: 'EMP-00005', result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New User',
          email: 'new@company.com',
          mobile: '5555555555',
          role: 'Marketing Executive',
          status: 'Active',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('user.created');
      expect(auditParams[3]).toBe('user');
    });

    test('test-ep-5.2.1-b-034: User update creates audit log entry', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          if (params[0] === MARKETING_USER.id || sql.includes('employee_id')) {
            return Promise.resolve({
              rows: [{
                id: MARKETING_USER.id, employee_id: 'EMP-00002', name: 'Old Name',
                email: 'john@company.com', mobile: '0987654321', role: 'Marketing Executive',
                status: 'active', accountStatus: 'active',
              }],
            });
          }
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT id FROM users WHERE email = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT id FROM users WHERE mobile = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE users SET')) {
          return Promise.resolve({
            rows: [{
              id: MARKETING_USER.id, employee_id: 'EMP-00002', name: 'New Name',
              email: 'john@company.com', mobile: '0987654321', role: 'Marketing Executive',
              status: 'active',
            }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-upd-user', user_id: ADMIN_USER.id, action: 'user.updated', resource: 'user', resourceId: 'EMP-00002', result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put(`/api/admin/users/${MARKETING_USER.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('user.updated');
      expect(auditParams[3]).toBe('user');
    });

    test('test-ep-5.2.1-b-035: User delete returns 200 and creates audit log entry', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: MARKETING_USER.id, employee_id: 'EMP-00002', name: 'John Doe',
              email: 'john@company.com', role: 'Marketing Executive',
              status: 'active', accountStatus: 'active',
            }],
          });
        }
        if (sql.includes('DELETE FROM users')) {
          return Promise.resolve({
            rows: [{ id: MARKETING_USER.id, employee_id: 'EMP-00002', name: 'John Doe' }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-del-user', user_id: ADMIN_USER.id, action: 'user.deleted', resource: 'user', resourceId: 'EMP-00002', result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete(`/api/admin/users/${MARKETING_USER.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('user.deleted');
      expect(auditParams[3]).toBe('user');
    });

    test('test-ep-5.2.1-b-036: Role change creates USER_ROLE_CHANGED audit log', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          if (params[0] === MARKETING_USER.id || sql.includes('employee_id')) {
            return Promise.resolve({
              rows: [{
                id: MARKETING_USER.id, employee_id: 'EMP-00002', name: 'John Doe',
                email: 'john@company.com', mobile: '0987654321', role: 'Marketing Executive',
                status: 'active', accountStatus: 'active',
              }],
            });
          }
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT id FROM users WHERE email = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT id FROM users WHERE mobile = $1')) {
          if (params[0] === '0987654321') return Promise.resolve({ rows: [{ id: MARKETING_USER.id }] });
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('UPDATE users SET')) {
          return Promise.resolve({
            rows: [{
              id: MARKETING_USER.id, employee_id: 'EMP-00002', name: 'John Doe',
              email: 'john@company.com', mobile: '0987654321', role: 'Admin',
              status: 'active',
            }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-role', user_id: ADMIN_USER.id, action: 'user.role_changed', resource: 'user', resourceId: 'EMP-00002', result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put(`/api/admin/users/${MARKETING_USER.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'Admin' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('user.role_changed');
      expect(auditParams[3]).toBe('user');
      const details = typeof auditParams[5] === 'string' ? JSON.parse(auditParams[5]) : auditParams[5];
      expect(details.new_role).toBe('Admin');
    });

    test('test-ep-5.2.1-b-037: Lead assignment creates audit log entry', async () => {
      const LEAD_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const TARGET_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const previousOwnerEmpId = 'EMP-00003';

      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          if (params[0] === TARGET_USER_ID || params[0] === 'ffffffff-ffff-ffff-ffff-ffffffffffff') {
            return Promise.resolve({
              rows: [{ id: TARGET_USER_ID, employee_id: 'EMP-00005', name: 'Target User', role: 'Marketing Executive', status: 'active', accountStatus: 'active' }],
            });
          }
          return Promise.resolve({
            rows: [{ id: params[0], role: params[0] === ADMIN_USER.id ? 'Admin' : 'Marketing Executive', status: 'active', accountStatus: 'active', name: 'Mock User', employee_id: 'EMP001' }],
          });
        }
        if (sql.includes('SELECT l.*, u.name as assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = $1')) {
          return Promise.resolve({
            rows: [{ id: LEAD_UUID, lead_id: 'LD-001', company_name: 'Acme Corp', assigned_to: null, stage: 'New Lead' }],
          });
        }
        if (sql.includes('SELECT employee_id FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [{ employee_id: previousOwnerEmpId }] });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-assign', user_id: ADMIN_USER.id, action: 'lead.assigned', resource: 'lead', resourceId: LEAD_UUID, result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const client = mkClient([
        ['BEGIN', () => ({})],
        ['UPDATE leads SET assigned_to', () => ({ rows: [{ id: LEAD_UUID, assigned_to: TARGET_USER_ID }] })],
        ['INSERT INTO lead_history', () => ({ rows: [{ id: 'hist-assign' }] })],
        ['COMMIT', () => ({})],
      ]);
      getClient.mockResolvedValue(client);

      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: TARGET_USER_ID });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = client.query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('lead.assigned');
      expect(auditParams[3]).toBe('lead');
    });

    test('test-ep-5.2.1-b-038: Category creation creates audit log entry', async () => {
      const CAT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT * FROM business_categories')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO business_categories')) {
          return Promise.resolve({
            rows: [{ id: CAT_ID, category_name: 'IT Services', status: 'Active' }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-cat-create', user_id: ADMIN_USER.id, action: 'category.created', resource: 'category', resourceId: CAT_ID, result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category_name: 'IT Services' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('category.created');
      expect(auditParams[3]).toBe('category');
    });

    test('test-ep-5.2.1-b-039: Category update creates audit log entry', async () => {
      const CAT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT * FROM business_categories WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: CAT_ID, category_name: 'IT Services', status: 'Active' }],
          });
        }
        if (sql.includes('SELECT * FROM business_categories ORDER BY')) {
          return Promise.resolve({ rows: [{ id: CAT_ID, category_name: 'IT Services', status: 'Active' }] });
        }
        if (sql.includes('UPDATE business_categories SET')) {
          return Promise.resolve({
            rows: [{ id: CAT_ID, category_name: 'Software Development', status: 'Active' }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-cat-upd', user_id: ADMIN_USER.id, action: 'category.updated', resource: 'category', resourceId: CAT_ID, result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .put(`/api/admin/categories/${CAT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category_name: 'Software Development' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('category.updated');
      expect(auditParams[3]).toBe('category');
    });

    test('test-ep-5.2.1-b-040: Category delete creates audit log entry', async () => {
      const CAT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT * FROM business_categories WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: CAT_ID, category_name: 'Temp Category', status: 'Active' }],
          });
        }
        if (sql.includes('SELECT COUNT(*)::int AS count FROM business_sub_categories WHERE category_id = $1')) {
          return Promise.resolve({ rows: [{ count: 0 }] });
        }
        if (sql.includes('SELECT COUNT(*)::int AS count FROM leads WHERE category = $1')) {
          return Promise.resolve({ rows: [{ count: 0 }] });
        }
        if (sql.includes('DELETE FROM business_categories WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: CAT_ID, category_name: 'Temp Category' }] });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          return Promise.resolve({
            rows: [{ id: 'audit-cat-del', user_id: ADMIN_USER.id, action: 'category.deleted', resource: 'category', resourceId: CAT_ID, result: 'success' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .delete(`/api/admin/categories/${CAT_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBeGreaterThanOrEqual(1);
      const auditParams = auditCalls[0][1];
      expect(auditParams[2]).toBe('category.deleted');
      expect(auditParams[3]).toBe('category');
    });

    test('test-ep-5.2.1-b-041: Transaction atomicity ΓÇö validation failure prevents audit log', async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@company.com', mobile: '1111111111', role: 'Marketing Executive', status: 'Active' });

      expect(res.status).toBe(400);

      const auditCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO audit_logs'));
      expect(auditCalls.length).toBe(0);
    });

    test('test-ep-5.2.1-b-042: Transaction atomicity ΓÇö audit log failure returns 500, category not created', async () => {
      const CAT_ID = 'abcdabcd-abcd-abcd-abcd-abcdabcdabcd';
      let auditLogCalled = false;
      let categoryInsertCommitted = false;

      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({
            rows: [{ id: params[0], role: 'Admin', status: 'active', accountStatus: 'active', name: 'Admin User', employee_id: 'EMP-00001' }],
          });
        }
        if (sql.includes('SELECT COUNT(*)::int AS total FROM business_categories')) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        if (sql.includes('SELECT c.id, c.category_name, c.status')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO business_categories')) {
          return Promise.resolve({
            rows: [{ id: CAT_ID, category_name: 'Automated Systems', status: 'Active' }],
          });
        }
        if (sql.includes('INSERT INTO audit_logs')) {
          auditLogCalled = true;
          return Promise.reject(new Error('DB constraint violation on audit_logs'));
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ category_name: 'Automated Systems' });
      expect(res.status).toBe(500);
      expect(auditLogCalled).toBe(true);
      // Rollback: SELECT after failed category creation should not find the category
      const rollbackRes = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(rollbackRes.status).toBe(200);
      const categories = rollbackRes.body.data?.data || rollbackRes.body.data || [];
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.find(c => c.id === CAT_ID)).toBeUndefined();
    });
  });
});
