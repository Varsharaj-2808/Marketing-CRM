const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../../src/config/db', () => ({
  query: (...args) => mockQuery(...args),
  getClient: jest.fn(),
}));

jest.mock('../../src/utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/utils/algoliaService', () => ({
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
  app.use('/api/auth', require('../../src/routes/auth'));
  app.use('/api/admin', require('../../src/routes/admin'));
  app.use('/api/marketing', require('../../src/routes/marketing'));
  app.use(require('../../src/middleware/errorHandler'));
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

const CATEGORY_UUID = 'd3b07384-d113-4a00-a541-b8448fb8b801';
const SUBCATEGORY_UUID = 'e4c07384-d113-4a00-a541-b8448fb8b999';

const LEAD_ROW = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  seq: 1,
  lead_id: 'LD-2026-00001',
  company_name: 'Acme Corp',
  contact_person: 'John Doe',
  mobile_number: '9876543210',
  email: 'john@acme.com',
  website: 'https://acme.com',
  city: 'New York',
  lead_source: 'Website',
  category: CATEGORY_UUID,
  sub_category: SUBCATEGORY_UUID,
  service_interested: ['Web Dev'],
  priority: 'Hot',
  estimated_value: 50000,
  assigned_to: MARKETING_USER.id,
  assigned_at: '2026-07-01T10:00:00.000Z',
  stage: 'Negotiation',
  lead_status: 'Open',
  lost_reason: null,
  final_deal_value: null,
  closure_date: null,
  created_at: '2026-06-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
  assigned_to_name: 'Marketing User',
};

const LEAD_ROW_2 = {
  ...LEAD_ROW,
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  lead_id: 'LD-2026-00002',
  company_name: 'Tech Corp',
};

beforeEach(() => {
  mockQuery.mockReset();
});

// ============================================================
// TASK-3.2.1-01: Admin Lead List filtered by Category
// ============================================================
describe('TASK-3.2.1-01: Category/Sub-Category filter on Lead List', () => {
  test('BE-TC-3.2.1-01: Admin Lead List filtered by Category ΓÇö 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*) FROM leads l', () => ({ rows: [{ count: 2 }] })],
      ['SELECT l.*, u.name as assigned_to_name', () => ({ rows: [LEAD_ROW, LEAD_ROW_2] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/leads?category=${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('page');
    expect(res.body.data).toHaveProperty('totalCount');
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.data[0]).toHaveProperty('category', CATEGORY_UUID);
    expect(res.body.data.data[0]).toHaveProperty('company_name');
    expect(res.body.data.data[0]).toHaveProperty('lead_id');
  });

  test('BE-TC-3.2.1-02: Marketing Lead List filtered by Category & Sub-Category ΓÇö 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COUNT(*) FROM leads l', () => ({ rows: [{ count: 1 }] })],
      ['SELECT l.*, u.name as assigned_to_name', () => ({ rows: [LEAD_ROW] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/marketing/leads?category=${CATEGORY_UUID}&sub_category=${SUBCATEGORY_UUID}`)
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('BE-TC-3.2.1-03: Admin Dashboard KPIs filtered by Category ΓÇö 200', async () => {
    const kpiRow = {
      total_leads: 15,
      won_leads: 4,
      lost_leads: 2,
      active_leads: 9,
      total_estimated_value: 450000,
    };
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['total_leads', () => ({ rows: [kpiRow] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/dashboard/kpis?category=${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// TASK-3.2.1-02: Won-rate by Category
// ============================================================
describe('TASK-3.2.1-02: Won-rate-by-Category widget', () => {
  test('BE-TC-3.2.1-04: Retrieve Won-rate by Category ΓÇö 200', async () => {
    const wonRateRows = [
      { category_id: CATEGORY_UUID, category_name: 'Technology', total_closed: 20, won: 8, lost: 12, win_rate: '40.00%' },
      { category_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', category_name: 'Finance', total_closed: 15, won: 9, lost: 6, win_rate: '60.00%' },
    ];
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['win_rate', () => ({ rows: wonRateRows })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/dashboard/won-rate-by-category')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// TASK-3.2.1-03: Lead Volume by Category
// ============================================================
describe('TASK-3.2.1-03: Lead-volume-by-Category chart', () => {
  test('BE-TC-3.2.1-05: Retrieve Lead Volume by Category ΓÇö 200', async () => {
    const volumeRows = [
      { category_id: CATEGORY_UUID, category_name: 'Technology', lead_count: 45 },
      { category_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', category_name: 'Finance', lead_count: 30 },
    ];
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['lead_count', () => ({ rows: volumeRows })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/dashboard/lead-volume-by-category')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ============================================================
// TASK-3.2.1-04: Category breakdown in CSV/Excel export
// ============================================================
describe('TASK-3.2.1-04: Category breakdown in CSV/Excel export', () => {
  test('BE-TC-3.2.1-06: Export CSV with Category filter ΓÇö 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['SELECT l.*, u.name as assigned_to_name', () => ({ rows: [LEAD_ROW, LEAD_ROW_2] })],
      ['COUNT(*) FROM leads l', () => ({ rows: [{ count: 2 }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get(`/api/admin/leads/export?format=csv&category=${CATEGORY_UUID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('BE-TC-3.2.1-07: Export Excel Report grouped by Category ΓÇö 200', async () => {
    const reportRows = [
      { category_name: 'Technology', total_leads: 45, won: 8, lost: 5, conversion_rate: '17.78%' },
      { category_name: 'Finance', total_leads: 30, won: 9, lost: 3, conversion_rate: '30.00%' },
    ];
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['conversion_rate', () => ({ rows: reportRows })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/reports/export?report=lead-conversion-by-category&format=excel')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
