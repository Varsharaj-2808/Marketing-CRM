const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../config/db', () => ({
  query: (...args) => mockQuery(...args),
  getClient: jest.fn(),
}));

const mockGetClient = () => {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
  };
  require('../config/db').getClient.mockResolvedValue(client);
  return client;
};

jest.mock('../utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(),
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
  app.use(express.urlencoded({ extended: true }));
  app.use('/exports', express.static(require('path').join(__dirname, '..', '..', 'exports'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.xlsx')) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${require('path').basename(filePath)}"`);
      } else if (filePath.endsWith('.csv')) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${require('path').basename(filePath)}"`);
      }
    },
  }));
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/admin', require('../routes/admin'));
  app.use('/api/marketing', require('../routes/marketing'));
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

const defaultQuery = (handlers) => {
  mockQuery.mockImplementation((sql, params) => {
    for (const [pattern, handler] of handlers) {
      if (sql.includes(pattern)) return handler(sql, params);
    }
    return { rows: [] };
  });
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  mockQuery.mockReset();
});

afterAll(() => jest.restoreAllMocks());

// ============================================================
// API-1: POST /admin/leads/saved-views — Create Saved View
// ============================================================
describe('API-1: POST /admin/leads/saved-views', () => {
  const SAVED_VIEW = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'High Priority Leads',
    filters: { status: 'Open', priority: 'High', stage: 'Contacted' },
    created_by: ADMIN_USER.id,
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
  };

  test('test-ep-2.2.1-001: Create saved view with name and all filter fields — 201', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [SAVED_VIEW] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'High Priority Leads', filters: { status: 'Open', priority: 'High', stage: 'Contacted' } });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(UUID_PATTERN);
    expect(res.body.name).toBe('High Priority Leads');
    expect(res.body.filters).toEqual({ status: 'Open', priority: 'High', stage: 'Contacted' });
    expect(res.body.created_by).toBe(ADMIN_USER.id);
    expect(res.body.created_at).toBeDefined();
    expect(res.body.updated_at).toBeDefined();
  });

  test('test-ep-2.2.1-002: Create saved view with name only and no filters — 201', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [{ ...SAVED_VIEW, name: 'All Leads', filters: {} }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'All Leads', filters: {} });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('All Leads');
    expect(res.body.filters).toEqual({});
  });

  test('test-ep-2.2.1-003: Create saved view with partial filters (only status) — 201', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [{ ...SAVED_VIEW, name: 'Open Leads', filters: { status: 'Open' } }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Open Leads', filters: { status: 'Open' } });
    expect(res.status).toBe(201);
    expect(res.body.filters).toEqual({ status: 'Open' });
  });

  test('test-ep-2.2.1-004: Missing name field — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ filters: { status: 'Open' } });
    expect(res.status).toBe(400);
    expect(res.body.name).toBe('Name is required');
  });

  test('test-ep-2.2.1-005: Empty string name — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '', filters: {} });
    expect(res.status).toBe(400);
    expect(res.body.name).toBe('Name cannot be empty');
  });

  test('test-ep-2.2.1-006: Duplicate view name for same admin user — 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [{ id: 'existing-view-id' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'My Views', filters: {} });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('A saved view with this name already exists');
  });

  test('test-ep-2.2.1-007: Duplicate view name allowed for different admin users — 201', async () => {
    const otherAdminUser = { ...ADMIN_USER, id: '55555555-5555-5555-5555-555555555555' };
    const otherAdminToken = jwt.sign(
      { id: otherAdminUser.id, email: otherAdminUser.email, role: otherAdminUser.role },
      process.env.JWT_SECRET, { expiresIn: '15m' }
    );
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [otherAdminUser] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [{ ...SAVED_VIEW, name: 'My Views', created_by: otherAdminUser.id }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ name: 'My Views', filters: {} });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Views');
  });

  test('test-ep-2.2.1-008: Unauthorized — Marketing Executive role — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ name: 'Test', filters: {} });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Admin access required.');
  });

  test('test-ep-2.2.1-009: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .send({ name: 'Test', filters: {} });
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-010: Name at maximum allowed length (100 characters) — 201', async () => {
    const name100 = 'A'.repeat(100);
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [{ ...SAVED_VIEW, name: name100 }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: name100, filters: {} });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(name100);
  });

  test('test-ep-2.2.1-011: Name exceeding maximum length — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'A'.repeat(101), filters: {} });
    expect(res.status).toBe(400);
    expect(res.body.name).toBe('Name must be 100 characters or less');
  });

  test('test-ep-2.2.1-012: Filters with unknown/extra fields — 201', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [{ ...SAVED_VIEW, name: 'Test', filters: { status: 'Open', unknown_field: 'value' } }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', filters: { status: 'Open', unknown_field: 'value' } });
    expect(res.status).toBe(201);
    expect(res.body.filters.unknown_field).toBe('value');
  });

  test('test-ep-2.2.1-013: XSS attempt in name field — 201', async () => {
    const xssName = "<script>alert('xss')</script>";
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['INSERT INTO saved_views', () => ({ rows: [{ ...SAVED_VIEW, name: xssName }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/saved-views')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: xssName, filters: {} });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe(xssName);
  });
});

// ============================================================
// API-2: PUT /admin/leads/saved-views/{viewId} — Update Saved View
// ============================================================
describe('API-2: PUT /admin/leads/saved-views/:viewId', () => {
  const VIEW_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const EXISTING_VIEW = {
    id: VIEW_ID,
    name: 'Follow-up',
    filters: { status: 'Open', stage: 'Contacted' },
    created_by: ADMIN_USER.id,
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
  };
  const UPDATED_VIEW = {
    ...EXISTING_VIEW,
    name: 'Today Follow-up',
    filters: { status: 'Open', stage: 'Contacted' },
    updated_at: '2026-07-01T11:00:00.000Z',
  };

  test('test-ep-2.2.1-014: Update name only, filters remain unchanged — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
      ['UPDATE saved_views', () => ({ rows: [UPDATED_VIEW] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Today Follow-up' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Today Follow-up');
    expect(res.body.filters).toEqual({ status: 'Open', stage: 'Contacted' });
    expect(res.body.updated_at).toBeDefined();
  });

  test('test-ep-2.2.1-015: Update filters only, name remains unchanged — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
      ['UPDATE saved_views', () => ({ rows: [{ ...EXISTING_VIEW, filters: { stage: 'Meeting Scheduled' }, updated_at: '2026-07-01T11:00:00.000Z' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ filters: { stage: 'Meeting Scheduled' } });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Follow-up');
    expect(res.body.filters).toEqual({ stage: 'Meeting Scheduled' });
  });

  test('test-ep-2.2.1-016: Update both name and filters — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [] })],
      ['UPDATE saved_views', () => ({ rows: [{ ...EXISTING_VIEW, name: 'Updated View', filters: { priority: 'High' }, updated_at: '2026-07-01T11:00:00.000Z' }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated View', filters: { priority: 'High' } });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated View');
    expect(res.body.filters).toEqual({ priority: 'High' });
  });

  test('test-ep-2.2.1-017: Update with empty name — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.name).toBe('Name cannot be empty');
  });

  test('test-ep-2.2.1-018: Update with no fields provided — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('At least one field (name or filters) must be provided');
  });

  test('test-ep-2.2.1-019: Non-existent viewId — 404', async () => {
    const nonExistentId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Saved view not found');
  });

  test('test-ep-2.2.1-020: Invalid viewId format — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .put('/api/admin/leads/saved-views/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid view ID format');
  });

  test('test-ep-2.2.1-021: Update another admin\'s saved view (IDOR prevention) — 403', async () => {
    const otherAdminView = {
      ...EXISTING_VIEW,
      created_by: '55555555-5555-5555-5555-555555555555',
    };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [otherAdminView] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('You do not have permission to modify this saved view');
  });

  test('test-ep-2.2.1-022: Unauthorized — Marketing Executive role — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(403);
  });

  test('test-ep-2.2.1-023: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .send({ name: 'New Name' });
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-024: Update duplicate name (same user, different view) — 409', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
      ['FROM saved_views WHERE name = $1', () => ({ rows: [{ id: 'other-view-id' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .put(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Priority' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('A saved view with this name already exists');
  });
});

// ============================================================
// API-3: DELETE /admin/leads/saved-views/{viewId} — Delete Saved View
// ============================================================
describe('API-3: DELETE /admin/leads/saved-views/:viewId', () => {
  const VIEW_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const EXISTING_VIEW = {
    id: VIEW_ID,
    name: 'Test View',
    filters: {},
    created_by: ADMIN_USER.id,
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
  };

  test('test-ep-2.2.1-025: Delete existing saved view owned by the requesting admin — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
      ['DELETE FROM saved_views WHERE id = $1', () => ({ rows: [{ id: VIEW_ID }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted');
  });

  test('test-ep-2.2.1-026: Delete non-existent viewId — 404', async () => {
    const nonExistentId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/leads/saved-views/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Saved view not found');
  });

  test('test-ep-2.2.1-027: Invalid viewId format — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .delete('/api/admin/leads/saved-views/bad-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid view ID format');
  });

  test('test-ep-2.2.1-028: Delete another admin\'s saved view (IDOR prevention) — 403', async () => {
    const otherAdminView = { ...EXISTING_VIEW, created_by: '55555555-5555-5555-5555-555555555555' };
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [otherAdminView] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('You do not have permission to delete this saved view');
  });

  test('test-ep-2.2.1-029: Unauthorized — Marketing Executive role — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
  });

  test('test-ep-2.2.1-030: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .delete(`/api/admin/leads/saved-views/${VIEW_ID}`);
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-031: Delete already-deleted view (idempotency) — 200 then 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [EXISTING_VIEW] })],
      ['DELETE FROM saved_views WHERE id = $1', () => ({ rows: [{ id: VIEW_ID }] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res1 = await request(app)
      .delete(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res1.status).toBe(200);
    expect(res1.body.message).toBe('Deleted');

    mockQuery.mockReset();
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM saved_views WHERE id = $1', () => ({ rows: [] })],
    ]);
    const res2 = await request(app)
      .delete(`/api/admin/leads/saved-views/${VIEW_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(404);
    expect(res2.body.error).toBe('Saved view not found');
  });
});

// ============================================================
// API-4: POST /admin/leads/bulk-select — Bulk Select Leads
// ============================================================
describe('API-4: POST /admin/leads/bulk-select', () => {
  test('test-ep-2.2.1-032: Select multiple valid lead IDs — 200', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'lead-002'] });
    expect(res.status).toBe(200);
    expect(res.body.selected).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.lead_ids).toEqual(['lead-001', 'lead-002']);
  });

  test('test-ep-2.2.1-033: Select empty array (no leads) — 200', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: [] });
    expect(res.status).toBe(200);
    expect(res.body.selected).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.lead_ids).toEqual([]);
  });

  test('test-ep-2.2.1-034: Select single lead ID — 200', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'] });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('test-ep-2.2.1-035: lead_ids is not an array — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: 'lead-001' });
    expect(res.status).toBe(400);
    expect(res.body.lead_ids).toBe('Must be an array of lead ID strings');
  });

  test('test-ep-2.2.1-036: lead_ids contains non-string entries — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: [123, true, null] });
    expect(res.status).toBe(400);
    expect(res.body.lead_ids).toBe('Each lead ID must be a string');
  });

  test('test-ep-2.2.1-037: Unauthorized — Marketing Executive role — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ lead_ids: ['lead-001'] });
    expect(res.status).toBe(403);
  });

  test('test-ep-2.2.1-038: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .send({ lead_ids: ['lead-001'] });
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-039: Duplicate lead IDs in the array — 200 with deduplication', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-select')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'lead-001', 'lead-002'] });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.lead_ids).toEqual(['lead-001', 'lead-002']);
  });
});

// ============================================================
// API-5: POST /admin/leads/bulk-assign — Bulk Assign Leads
// ============================================================
describe('API-5: POST /admin/leads/bulk-assign', () => {
  const mockClient = () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    require('../config/db').getClient.mockResolvedValue(client);
    return client;
  };

  test('test-ep-2.2.1-040: Assign multiple leads to a valid active user — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: 'user-101', role: 'Marketing Executive', accountStatus: 'active', status: 'active', name: 'Marketing User' }] })],
      ['FROM leads WHERE id IN', () => ({ rows: [{ id: 'lead-001', lead_id: 'LD-2026-00001', assigned_to: null }, { id: 'lead-002', lead_id: 'LD-2026-00002', assigned_to: null }] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'lead-002'], assigned_to: 'user-101' });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
    expect(res.body.count).toBe(2);
  });

  test('test-ep-2.2.1-041: Assign with a reason field — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: 'user-101', role: 'Marketing Executive', accountStatus: 'active', status: 'active', name: 'Marketing User' }] })],
      ['FROM leads WHERE id IN', () => ({ rows: [{ id: 'lead-001', lead_id: 'LD-2026-00001', assigned_to: null }] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], assigned_to: 'user-101', reason: 'Region reassignment' });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
    expect(res.body.count).toBe(1);
  });

  test('test-ep-2.2.1-042: Assign single lead — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: 'user-101', role: 'Marketing Executive', accountStatus: 'active', status: 'active', name: 'Marketing User' }] })],
      ['FROM leads WHERE id IN', () => ({ rows: [{ id: 'lead-001', lead_id: 'LD-2026-00001', assigned_to: null }] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], assigned_to: 'user-101' });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('test-ep-2.2.1-043: Admin assigns lead to themselves — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: ADMIN_USER.id, role: 'Admin', accountStatus: 'active', status: 'active', name: 'Admin User' }] })],
      ['FROM leads WHERE id IN', () => ({ rows: [{ id: 'lead-001', lead_id: 'LD-2026-00001', assigned_to: null }] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], assigned_to: ADMIN_USER.id });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
  });

  test('test-ep-2.2.1-044: Empty lead_ids array — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: [], assigned_to: 'user-101' });
    expect(res.status).toBe(400);
    expect(res.body.lead_ids).toBe('At least one lead ID is required');
  });

  test('test-ep-2.2.1-045: Missing assigned_to field — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'] });
    expect(res.status).toBe(400);
    expect(res.body.assigned_to).toBe('Target user ID is required');
  });

  test('test-ep-2.2.1-046: Non-existent assigned_to user — 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], assigned_to: 'nonexistent-user' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Assigned user not found');
  });

  test('test-ep-2.2.1-047: Deactivated/inactive user as assignee — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: 'inactive-user', role: 'Marketing Executive', accountStatus: 'inactive', status: 'inactive' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], assigned_to: 'inactive-user' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot assign leads to a deactivated user');
  });

  test('test-ep-2.2.1-048: One or more lead IDs do not exist (partial failure) — 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: 'user-101', role: 'Marketing Executive', accountStatus: 'active', status: 'active' }] })],
      ['FROM leads WHERE id IN', () => ({ rows: [{ id: 'lead-001', lead_id: 'LD-2026-00001', assigned_to: null }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'nonexistent-lead'], assigned_to: 'user-101' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Lead(s) not found');
    expect(res.body.error).toContain('nonexistent-lead');
  });

  test('test-ep-2.2.1-049: Unauthorized — Marketing Executive role — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ lead_ids: ['lead-001'], assigned_to: 'user-101' });
    expect(res.status).toBe(403);
  });

  test('test-ep-2.2.1-050: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .send({ lead_ids: ['lead-001'], assigned_to: 'user-101' });
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-051: Large batch assignment (1000+ leads) — 200', async () => {
    const leadIds = Array.from({ length: 1000 }, (_, i) => `lead-${String(i).padStart(3, '0')}`);
    const leads = leadIds.map(id => ({ id, lead_id: `LD-2026-${String(id).padStart(5, '0')}`, assigned_to: null }));
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [{ id: 'user-101', role: 'Marketing Executive', accountStatus: 'active', status: 'active', name: 'Marketing User' }] })],
      ['FROM leads WHERE id IN', () => ({ rows: leads })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: leadIds, assigned_to: 'user-101' });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
    expect(res.body.count).toBe(1000);
  });
});

// ============================================================
// API-6: POST /admin/leads/export — Bulk Export Leads
// ============================================================
describe('API-6: POST /admin/leads/export', () => {
  const EXPORT_LEADS = [
    { id: 'lead-001', lead_id: 'LD-2026-00001', company_name: 'Alpha Corp', contact_person: 'Alice', mobile_number: '9111111111', email: 'alice@alpha.com', lead_source: 'Website', category: 'IT Services', priority: 'Hot', stage: 'New Lead', estimated_value: 50000, assigned_to_name: 'Marketing User', created_at: '2026-06-01T00:00:00.000Z', updated_at: '2026-06-15T00:00:00.000Z' },
    { id: 'lead-002', lead_id: 'LD-2026-00002', company_name: 'Beta Inc', contact_person: 'Bob', mobile_number: '9222222222', email: 'bob@beta.com', lead_source: 'Referral', category: 'Consulting', priority: 'Warm', stage: 'Contacted', estimated_value: 30000, assigned_to_name: null, created_at: '2026-06-02T00:00:00.000Z', updated_at: '2026-06-16T00:00:00.000Z' },
  ];

  test('test-ep-2.2.1-052: Export selected leads to xlsx format — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: EXPORT_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'lead-002'], format: 'xlsx' });
    expect(res.status).toBe(200);
    expect(res.body.download_url).toBeDefined();
    expect(res.body.download_url).toMatch(/^\/exports\/leads-\d{4}-\d{2}-\d{2}-[a-z0-9]+\.xlsx$/);
  });

  test('test-ep-2.2.1-053: Export selected leads to csv format — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: EXPORT_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'lead-002'], format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.body.download_url).toBeDefined();
    expect(res.body.download_url).toMatch(/^\/exports\/leads-\d{4}-\d{2}-\d{2}-[a-z0-9]+\.csv$/);
  });

  test('test-ep-2.2.1-054: Export all leads (empty lead_ids array) — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: EXPORT_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: [], format: 'xlsx' });
    expect(res.status).toBe(200);
    expect(res.body.download_url).toBeDefined();
  });

  test('test-ep-2.2.1-055: Invalid format specified — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], format: 'pdf' });
    expect(res.status).toBe(400);
    expect(res.body.format).toBe("Format must be 'xlsx' or 'csv'");
  });

  test('test-ep-2.2.1-056: Missing format field — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'] });
    expect(res.status).toBe(400);
    expect(res.body.format).toBe('Export format is required');
  });

  test('test-ep-2.2.1-057: Non-existent lead IDs in selection — 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: [{ id: 'lead-001', lead_id: 'LD-2026-00001' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'nonexistent-lead'], format: 'xlsx' });
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Lead(s) not found');
  });

  test('test-ep-2.2.1-058: Unauthorized — Marketing Executive role — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ lead_ids: ['lead-001'], format: 'csv' });
    expect(res.status).toBe(403);
  });

  test('test-ep-2.2.1-059: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .send({ lead_ids: ['lead-001'], format: 'csv' });
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-060: Downloaded file is accessible and has correct headers — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: EXPORT_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001', 'lead-002'], format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.body.download_url).toBeDefined();

    const downloadRes = await request(app)
      .get(res.body.download_url);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('text/csv');
    expect(downloadRes.headers['content-disposition']).toContain('attachment');
    expect(downloadRes.text.length).toBeGreaterThan(0);
  });

  test('test-ep-2.2.1-061: Export with large dataset (10000+ leads) — 200', async () => {
    const largeLeads = Array.from({ length: 100 }, (_, i) => ({
      id: `lead-${String(i).padStart(5, '0')}`,
      lead_id: `LD-2026-${String(i + 1).padStart(5, '0')}`,
      company_name: `Company ${i}`,
      contact_person: `Person ${i}`,
      mobile_number: String(9000000000 + i),
      email: `person${i}@company.com`,
      lead_source: 'Website',
      category: 'IT Services',
      priority: i % 3 === 0 ? 'Hot' : i % 3 === 1 ? 'Warm' : 'Cold',
      stage: 'New Lead',
      estimated_value: 10000 + i * 1000,
      assigned_to_name: 'Marketing User',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-15T00:00:00.000Z',
    }));

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: largeLeads })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: [], format: 'csv' });
    expect(res.status).toBe(200);
    expect(res.body.download_url).toBeDefined();
  });

  test('test-ep-2.2.1-062: Export file includes correct columns — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads l LEFT JOIN users u', () => ({ rows: EXPORT_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['lead-001'], format: 'csv' });
    expect(res.status).toBe(200);

    const downloadRes = await request(app)
      .get(res.body.download_url);
    expect(downloadRes.status).toBe(200);
    const headerLine = downloadRes.text.split('\n')[0];
    expect(headerLine).toContain('Lead ID');
    expect(headerLine).toContain('Company Name');
    expect(headerLine).toContain('Contact Person');
    expect(headerLine).toContain('Mobile');
    expect(headerLine).toContain('Email');
    expect(headerLine).toContain('Lead Source');
    expect(headerLine).toContain('Category');
    expect(headerLine).toContain('Priority');
    expect(headerLine).toContain('Stage');
    expect(headerLine).toContain('Estimated Value');
    expect(headerLine).toContain('Assigned To');
    expect(headerLine).toContain('Created At');
    expect(headerLine).toContain('Updated At');
  });
});

// ============================================================
// API-7: GET /admin/leads — Admin Lead List
// ============================================================
describe('API-7: GET /admin/leads', () => {
  const MOCK_LEADS = [
    { id: 'lead-1', lead_id: 'LD-2026-00001', company_name: 'Alpha Corp', contact_person: 'Alice', mobile_number: '9111111111', email: 'alice@alpha.com', lead_source: 'Website', category: 'IT Services', priority: 'Hot', stage: 'New Lead', estimated_value: 50000, assigned_to: 'user-101', assigned_to_name: 'Marketing User', created_at: '2026-06-01T00:00:00.000Z', updated_at: '2026-06-15T00:00:00.000Z' },
    { id: 'lead-2', lead_id: 'LD-2026-00002', company_name: 'Beta Inc', contact_person: 'Bob', mobile_number: '9222222222', email: 'bob@beta.com', lead_source: 'Referral', category: 'Consulting', priority: 'Warm', stage: 'Contacted', estimated_value: 30000, assigned_to: null, assigned_to_name: null, created_at: '2026-06-02T00:00:00.000Z', updated_at: '2026-06-16T00:00:00.000Z' },
    { id: 'lead-3', lead_id: 'LD-2026-00003', company_name: 'Gamma Ltd', contact_person: 'Charlie', mobile_number: '9333333333', email: 'charlie@gamma.com', lead_source: 'Website', category: 'IT Services', priority: 'Cold', stage: 'Contacted', estimated_value: 10000, assigned_to: 'user-102', assigned_to_name: 'Another User', created_at: '2026-06-03T00:00:00.000Z', updated_at: '2026-06-17T00:00:00.000Z' },
  ];

  test('test-ep-2.2.1-063: Admin retrieves all leads without filters — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['assigned_to_name', () => ({ rows: MOCK_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.totalCount).toBe(3);
    expect(res.body.limit).toBe(25);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
  });

  test('test-ep-2.2.1-064: Admin sees leads owned by all Marketing Executives — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['assigned_to_name', () => ({ rows: MOCK_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    const owners = new Set(res.body.data.map(l => l.assigned_to_name));
    expect(owners.has('Marketing User')).toBe(true);
    expect(owners.has('Another User')).toBe(true);
    expect(owners.has(null)).toBe(true);
  });

  test('test-ep-2.2.1-065: Search leads by company name text — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['assigned_to_name', () => ({ rows: [MOCK_LEADS[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?search=Alpha')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].company_name).toContain('Alpha');
  });

  test('test-ep-2.2.1-066: Filter leads by status, priority, and stage — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['assigned_to_name', () => ({ rows: [MOCK_LEADS[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?status=Open&priority=High&stage=New%20Lead')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].priority).toBe('Hot');
  });

  test('test-ep-2.2.1-067: Filter leads by source, category, and assigned_to — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['assigned_to_name', () => ({ rows: [MOCK_LEADS[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?source=Website&category=IT%20Services&assigned_to=user-101')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].lead_source).toBe('Website');
  });

  test('test-ep-2.2.1-068: Sort leads by estimated value descending — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['assigned_to_name', () => ({ rows: [...MOCK_LEADS].sort((a, b) => b.estimated_value - a.estimated_value) })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?sortBy=estimated_value&sortOrder=desc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].estimated_value).toBe(50000);
  });

  test('test-ep-2.2.1-069: Sort leads by created date ascending — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['assigned_to_name', () => ({ rows: [...MOCK_LEADS].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?sortBy=created_at&sortOrder=asc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(new Date(res.body.data[0].created_at).getTime()).toBeLessThanOrEqual(new Date(res.body.data[1].created_at).getTime());
  });

  test('test-ep-2.2.1-070: Sort leads by priority and status — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['assigned_to_name', () => ({ rows: MOCK_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?sortBy=priority&sortOrder=desc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('test-ep-2.2.1-071: Paginated leads retrieval page 2 with custom limit — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '65' }] })],
      ['assigned_to_name', () => ({ rows: MOCK_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?page=2&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.totalPages).toBe(7);
    expect(res.body.totalCount).toBe(65);
    expect(res.body.limit).toBe(10);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('test-ep-2.2.1-072: Marketing Executive cannot access admin leads endpoint — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Admin access required.');
  });

  test('test-ep-2.2.1-073: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads');
    expect(res.status).toBe(401);
  });

  test('test-ep-2.2.1-074: Empty results with no matching leads — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '0' }] })],
      ['assigned_to_name', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?search=NonExistentCompanyXYZ')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(0);
    expect(res.body.totalCount).toBe(0);
    expect(res.body.data).toEqual([]);
  });

  test('test-ep-2.2.1-075: Combined search, filter, sort, and pagination — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['assigned_to_name', () => ({ rows: [MOCK_LEADS[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?search=Tech&status=Open&sortBy=created_at&sortOrder=desc&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('test-ep-2.2.1-076: Invalid page number (negative or zero) — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();

    const res1 = await request(app)
      .get('/api/admin/leads?page=0')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res1.status).toBe(400);
    expect(res1.body.page).toBe('Page must be a positive integer');

    const res2 = await request(app)
      .get('/api/admin/leads?page=-1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(400);
  });

  test('test-ep-2.2.1-077: Invalid sort field — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?sortBy=invalid_field')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.sortBy).toContain('Invalid sort field');
  });

  test('test-ep-2.2.1-078: Filter leads by created date range — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '2' }] })],
      ['assigned_to_name', () => ({ rows: MOCK_LEADS.slice(0, 2) })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?from_date=2026-01-01&to_date=2026-01-31')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.totalCount).toBe(2);
  });

  test('test-ep-2.2.1-079: Invalid date range (from_date greater than to_date) — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/leads?from_date=2026-02-01&to_date=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.from_date).toBe('from_date cannot be greater than to_date');
  });
});
