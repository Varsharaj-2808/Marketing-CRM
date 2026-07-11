/**
 * EPIC-6: Analytics & Export — Backend API Test Cases
 * Source of truth: backend-epic-6.md
 * Total: 54 test cases (22 + 24 + 8)
 * Stories: STORY-6.1.1 | STORY-6.2.1 | STORY-6.3.1
 *
 * ⚠️  THESE TESTS ARE FINAL — DO NOT MODIFY AFTER CREATION ⚠️
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// ─── App factory ────────────────────────────────────────────────────────────
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', require('../routes/admin'));
  app.use('/api/marketing', require('../routes/marketing'));
  app.use(require('../middleware/errorHandler'));
  return app;
};

const app = createApp();

// ─── DB mock ─────────────────────────────────────────────────────────────────
const { query, getClient } = require('../config/db');

jest.mock('../config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

// ─── Mocked external dependencies ────────────────────────────────────────────
jest.mock('../utils/algoliaService', () => ({
  saveUser: jest.fn().mockResolvedValue({}),
  deleteUser: jest.fn().mockResolvedValue({}),
  saveLead: jest.fn().mockResolvedValue({}),
}));
jest.mock('../utils/emailService', () => ({
  sendDailyReminderEmail: jest.fn().mockResolvedValue({}),
}));
jest.mock('../middleware/rateLimiter', () => ({
  rateLimiter: () => (req, res, next) => next(),
}));

// ─── JWT tokens ───────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing';

const ADMIN_ID   = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ME_001_ID  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ME_002_ID  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ME_003_ID  = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

let adminToken, meToken, me002Token, me003Token;

const adminRow = {
  id: ADMIN_ID, employee_id: 'EMP-00001', name: 'Admin Kumar',
  email: 'admin@company.com', role: 'Admin',
  accountStatus: 'active', status: 'active',
  failedLoginAttempts: 0, lockoutUntil: null,
};
const me001Row = {
  id: ME_001_ID, employee_id: 'EMP-00002', name: 'ME User',
  email: 'me@company.com', role: 'Marketing Executive',
  accountStatus: 'active', status: 'active',
  failedLoginAttempts: 0, lockoutUntil: null,
};
const me002Row = {
  id: ME_002_ID, employee_id: 'EMP-00003', name: 'ME User 002',
  email: 'me002@company.com', role: 'Marketing Executive',
  accountStatus: 'active', status: 'active',
  failedLoginAttempts: 0, lockoutUntil: null,
};
const me003Row = {
  id: ME_003_ID, employee_id: 'EMP-00004', name: 'ME User 003',
  email: 'me003@company.com', role: 'Marketing Executive',
  accountStatus: 'active', status: 'active',
  failedLoginAttempts: 0, lockoutUntil: null,
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  adminToken  = jwt.sign({ id: ADMIN_ID,  role: 'Admin' },               JWT_SECRET, { expiresIn: '1h' });
  meToken     = jwt.sign({ id: ME_001_ID, role: 'Marketing Executive' }, JWT_SECRET, { expiresIn: '1h' });
  me002Token  = jwt.sign({ id: ME_002_ID, role: 'Marketing Executive' }, JWT_SECRET, { expiresIn: '1h' });
  me003Token  = jwt.sign({ id: ME_003_ID, role: 'Marketing Executive' }, JWT_SECRET, { expiresIn: '1h' });
});

beforeEach(() => {
  jest.clearAllMocks();
  const mockClient = {
    query: jest.fn((sql, params) => query(sql, params)),
    release: jest.fn(),
  };
  getClient.mockResolvedValue(mockClient);
});

/** Queue a user-lookup mock for the protect middleware */
const mockProtect = (userRow) => {
  query.mockResolvedValueOnce({ rows: [userRow] });
};

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1 — STORY-6.1.1 Admin Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

describe('STORY-6.1.1 — GET /admin/dashboard/kpis', () => {

  // test-ep-6.1.1-b-001
  it('test-ep-6.1.1-b-001: Admin fetches aggregate KPI data — HTTP 200 with all required fields', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [{
        total_leads: '150', new: '30', today_followups: '12',
        contacted: '40', qualified: '25', meeting: '20',
        proposal: '15', negotiation: '10', won: '8', lost: '2',
        conversion_rate: '5.33%', hot_leads: '50', warm_leads: '70', cold_leads: '30',
      }],
    });

    const res = await request(app)
      .get('/api/admin/dashboard/kpis')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.total_leads).toBeDefined();
    expect(res.body.data.won).toBeDefined();
    expect(res.body.data.lost).toBeDefined();
    expect(typeof res.body.data.conversion_rate).toBe('string');
    expect(String(res.body.data.conversion_rate).endsWith('%')).toBe(true);
    expect(res.body.data.hot_leads).toBeDefined();
    expect(res.body.data.warm_leads).toBeDefined();
    expect(res.body.data.cold_leads).toBeDefined();
    expect(res.body.data.today_followups).toBeDefined();
  });

  // test-ep-6.1.1-b-002
  it('test-ep-6.1.1-b-002: Date-range filters KPIs to specified timeframe — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [{
        total_leads: '100', new: '20', today_followups: '8',
        contacted: '25', qualified: '18', won: '6', lost: '1', conversion_rate: '6%',
      }],
    });

    const res = await request(app)
      .get('/api/admin/dashboard/kpis?from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(String(res.body.data.conversion_rate).endsWith('%')).toBe(true);
  });

  // test-ep-6.1.1-b-003
  it('test-ep-6.1.1-b-003: Invalid date format returns 400', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/admin/dashboard/kpis?from=invalid&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid date format. Use YYYY-MM-DD');
  });

  // test-ep-6.1.1-b-004
  it('test-ep-6.1.1-b-004: Large dataset responds within 2s and includes meta cache fields', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [{
        total_leads: '50000', new: '8000', today_followups: '420',
        contacted: '12000', qualified: '9000', meeting: '7000',
        proposal: '6000', negotiation: '4000', won: '3000', lost: '1000',
        hold: '500', at_risk_count: '220', conversion_rate: '6%',
        hot_leads: '15000', warm_leads: '22000', cold_leads: '13000',
      }],
    });

    const start = Date.now();
    const res = await request(app)
      .get('/api/admin/dashboard/kpis?from=2026-01-01&to=2026-06-26')
      .set('Authorization', `Bearer ${adminToken}`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });

  // test-ep-6.1.1-b-005
  it('test-ep-6.1.1-b-005: Marketing Executive gets 403 on admin KPI endpoint', async () => {
    mockProtect(me001Row);

    const res = await request(app)
      .get('/api/admin/dashboard/kpis')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied. Admin role required.');
  });

  // test-ep-6.1.1-b-006
  it('test-ep-6.1.1-b-006: No token returns 401', async () => {
    const res = await request(app).get('/api/admin/dashboard/kpis');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.1.1 — GET /admin/dashboard/category-volume', () => {

  // test-ep-6.1.1-b-007
  it('test-ep-6.1.1-b-007: Admin fetches category-volume grouped by category and sub_category — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [
        { category: 'Software Solutions', sub_category: 'CRM', lead_count: 4200 },
        { category: 'Software Solutions', sub_category: 'ERP', lead_count: 2600 },
        { category: 'Digital Marketing',  sub_category: 'SEO', lead_count: 1800 },
      ],
    });
    query.mockResolvedValueOnce({ rows: [{ cnt: 6 }] });

    const res = await request(app)
      .get('/api/admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('count');
    expect(res.body.data[0]).toHaveProperty('percentage');
  });

  // test-ep-6.1.1-b-008
  it('test-ep-6.1.1-b-008: Filtering by category_id returns only sub_categories of that parent — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [
        { category: 'Software Solutions', sub_category: 'CRM', lead_count: 4200 },
        { category: 'Software Solutions', sub_category: 'ERP', lead_count: 2600 },
      ],
    });
    query.mockResolvedValueOnce({ rows: [{ cnt: 1 }] });

    const res = await request(app)
      .get('/api/admin/dashboard/category-volume?category_id=64f1a2b3c4d5e6f7a8b9c0d1&from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.every(d => d.category === 'Software Solutions')).toBe(true);
  });

  // test-ep-6.1.1-b-009
  it('test-ep-6.1.1-b-009: Invalid date format returns 400', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/admin/dashboard/category-volume?from=invalid&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid date format. Use YYYY-MM-DD');
  });

  // test-ep-6.1.1-b-010
  it('test-ep-6.1.1-b-010: Empty state — no leads in range returns data: [] — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

    const res = await request(app)
      .get('/api/admin/dashboard/category-volume?from=2020-01-01&to=2020-01-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  // test-ep-6.1.1-b-011
  it('test-ep-6.1.1-b-011: Marketing Executive gets 403 on category-volume', async () => {
    mockProtect(me001Row);

    const res = await request(app)
      .get('/api/admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied. Admin role required.');
  });

  // test-ep-6.1.1-b-012
  it('test-ep-6.1.1-b-012: No token returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.1.1 — GET /admin/dashboard/won-rate-by-source', () => {

  // test-ep-6.1.1-b-013
  it('test-ep-6.1.1-b-013: Admin fetches won-rate-by-source grouped by lead_source — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [
        { source: 'Website',    total: 12000, won: 900, lost: 400, win_rate: '7.5%' },
        { source: 'Referral',   total: 6000,  won: 720, lost: 150, win_rate: '12%' },
        { source: 'Google Ads', total: 9000,  won: 450, lost: 500, win_rate: '5%' },
      ],
    });

    const res = await request(app)
      .get('/api/admin/dashboard/won-rate-by-source?from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('source');
    expect(res.body.data[0]).toHaveProperty('total');
    expect(res.body.data[0]).toHaveProperty('won');
    expect(res.body.data[0]).toHaveProperty('lost');
    expect(res.body.data[0]).toHaveProperty('win_rate');
    expect(String(res.body.data[0].win_rate).endsWith('%')).toBe(true);
  });

  // test-ep-6.1.1-b-014
  it("test-ep-6.1.1-b-014: 'from' date later than 'to' date returns 400", async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/admin/dashboard/won-rate-by-source?from=2026-06-30&to=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("'from' date must be earlier than 'to' date");
  });

  // test-ep-6.1.1-b-015
  it('test-ep-6.1.1-b-015: Empty state when no won/lost leads in range — HTTP 200 data: []', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/dashboard/won-rate-by-source?from=2026-07-01&to=2026-07-05')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  // test-ep-6.1.1-b-016
  it('test-ep-6.1.1-b-016: Marketing Executive gets 403 on won-rate-by-source', async () => {
    mockProtect(me001Row);

    const res = await request(app)
      .get('/api/admin/dashboard/won-rate-by-source?from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied. Admin role required.');
  });

  // test-ep-6.1.1-b-017
  it('test-ep-6.1.1-b-017: No token returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/won-rate-by-source?from=2026-01-01&to=2026-06-30');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.1.1 — GET /admin/dashboard/at-risk', () => {

  // test-ep-6.1.1-b-018
  it('test-ep-6.1.1-b-018: Admin fetches at-risk leads with total_at_risk and breakdown — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [
        { id: 'l1', lead_id: 'LD-2026-00042', company_name: 'Acme Corp', assigned_to: 'Priya', days_overdue: 5 },
      ],
    });
    query.mockResolvedValueOnce({
      rows: [{ user_id: 'u1', user_name: 'Priya', at_risk_count: 34, oldest_overdue_days: 12 }],
    });

    const res = await request(app)
      .get('/api/admin/dashboard/at-risk?overdue_days=3&from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty('lead_id');
    expect(res.body.data[0]).toHaveProperty('days_overdue');
  });

  // test-ep-6.1.1-b-019
  it('test-ep-6.1.1-b-019: Non-positive-integer overdue_days returns 400', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/admin/dashboard/at-risk?overdue_days=abc')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('overdue_days must be a positive integer');
  });

  // test-ep-6.1.1-b-020
  it('test-ep-6.1.1-b-020: Empty state — no at-risk leads returns total_at_risk: 0 — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/dashboard/at-risk?overdue_days=3&from=2026-07-01&to=2026-07-05')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  // test-ep-6.1.1-b-021
  it('test-ep-6.1.1-b-021: Marketing Executive gets 403 on at-risk endpoint', async () => {
    mockProtect(me001Row);

    const res = await request(app)
      .get('/api/admin/dashboard/at-risk?overdue_days=3')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied. Admin role required.');
  });

  // test-ep-6.1.1-b-022
  it('test-ep-6.1.1-b-022: No token returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/at-risk?overdue_days=3');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2 — STORY-6.2.1 Marketing Executive Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

describe('STORY-6.2.1 — GET /marketing/dashboard', () => {

  // test-ep-6.2.1-b-001
  it('test-ep-6.2.1-b-001: ME fetches combined dashboard scoped to JWT user — HTTP 200', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({
      rows: [{ my_leads: '50', my_followups_today: '5', my_won_leads: '8', my_lost_leads: '3' }],
    });
    query.mockResolvedValueOnce({ rows: [{ won: '8', lost: '3' }] });

    const res = await request(app)
      .get('/api/marketing/dashboard')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.cards).toBeDefined();
    expect(res.body.data.conversion_rate).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.assigned_to).toBeDefined();
    expect(res.body.meta.generated_at).toBeDefined();
  });

  // test-ep-6.2.1-b-002
  it('test-ep-6.2.1-b-002: Invalid or expired token returns 401', async () => {
    const res = await request(app)
      .get('/api/marketing/dashboard')
      .set('Authorization', 'Bearer invalid_token_here');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid or expired token');
  });

  // test-ep-6.2.1-b-003
  it('test-ep-6.2.1-b-003: Admin token on Marketing-only route returns 403', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/marketing/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This endpoint is restricted to Marketing Executive role');
  });

  // test-ep-6.2.1-b-004
  it('test-ep-6.2.1-b-004: ME with zero leads — all card values 0, conversion_rate "0%" — HTTP 200', async () => {
    mockProtect(me002Row);
    query.mockResolvedValueOnce({
      rows: [{ my_leads: '0', my_followups_today: '0', my_won_leads: '0', my_lost_leads: '0' }],
    });
    query.mockResolvedValueOnce({ rows: [{ won: '0', lost: '0' }] });

    const res = await request(app)
      .get('/api/marketing/dashboard')
      .set('Authorization', `Bearer ${me002Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.cards.my_leads)).toBe(0);
    expect(Number(res.body.data.cards.my_followups_today)).toBe(0);
    expect(res.body.data.conversion_rate.rate).toBe('0%');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.2.1 — GET /marketing/dashboard/cards', () => {

  // test-ep-6.2.1-b-005
  it('test-ep-6.2.1-b-005: ME card counts scoped to authenticated user — HTTP 200', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({
      rows: [{ my_leads: '50', my_followups_today: '5', my_won_leads: '8', my_lost_leads: '3' }],
    });

    const res = await request(app)
      .get('/api/marketing/dashboard/cards')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.my_leads).toBeDefined();
    expect(res.body.data.my_followups_today).toBeDefined();
    expect(res.body.data.my_won_leads).toBeDefined();
    expect(res.body.data.my_lost_leads).toBeDefined();
  });

  // test-ep-6.2.1-b-006
  it('test-ep-6.2.1-b-006: Client-supplied assigned_to param is ignored — HTTP 200 with me-001 data', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({
      rows: [{ my_leads: '50', my_followups_today: '5', my_won_leads: '8', my_lost_leads: '3' }],
    });

    const res = await request(app)
      .get('/api/marketing/dashboard/cards?assigned_to=64f1a2b3c4d5e6f7a8b9c0d2')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.my_leads)).toBe(50);
    expect(Number(res.body.data.my_won_leads)).toBe(8);
  });

  // test-ep-6.2.1-b-007
  it('test-ep-6.2.1-b-007: ME with zero leads — all card values 0 — HTTP 200', async () => {
    mockProtect(me003Row);
    query.mockResolvedValueOnce({
      rows: [{ my_leads: '0', my_followups_today: '0', my_won_leads: '0', my_lost_leads: '0' }],
    });

    const res = await request(app)
      .get('/api/marketing/dashboard/cards')
      .set('Authorization', `Bearer ${me003Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.my_leads)).toBe(0);
    expect(Number(res.body.data.my_followups_today)).toBe(0);
    expect(Number(res.body.data.my_won_leads)).toBe(0);
    expect(Number(res.body.data.my_lost_leads)).toBe(0);
  });

  // test-ep-6.2.1-b-008
  it('test-ep-6.2.1-b-008: Admin token on Marketing-only cards route returns 403', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/marketing/dashboard/cards')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This endpoint is restricted to Marketing Executive role');
  });

  // test-ep-6.2.1-b-009
  it('test-ep-6.2.1-b-009: No token returns 401', async () => {
    const res = await request(app).get('/api/marketing/dashboard/cards');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.2.1 — GET /marketing/dashboard/conversion-rate', () => {

  // test-ep-6.2.1-b-010
  it('test-ep-6.2.1-b-010: ME personal conversion rate Won/(Won+Lost) — HTTP 200', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({ rows: [{ won: '8', lost: '3' }] });

    const res = await request(app)
      .get('/api/marketing/dashboard/conversion-rate')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.won)).toBe(8);
    expect(Number(res.body.data.lost)).toBe(3);
    expect(Number(res.body.data.total_closed)).toBe(11);
    expect(res.body.data.conversion_rate).toBe('72.73%');
  });

  // test-ep-6.2.1-b-011
  it('test-ep-6.2.1-b-011: Zero Won/Lost leads returns 0% without divide-by-zero — HTTP 200', async () => {
    mockProtect(me003Row);
    query.mockResolvedValueOnce({ rows: [{ won: '0', lost: '0' }] });

    const res = await request(app)
      .get('/api/marketing/dashboard/conversion-rate')
      .set('Authorization', `Bearer ${me003Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.won)).toBe(0);
    expect(Number(res.body.data.lost)).toBe(0);
    expect(Number(res.body.data.total_closed)).toBe(0);
    expect(res.body.data.conversion_rate).toBe('0%');
  });

  // test-ep-6.2.1-b-012
  it('test-ep-6.2.1-b-012: Date-range filter recalculates personal conversion rate — HTTP 200', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({ rows: [{ won: '5', lost: '2' }] });

    const res = await request(app)
      .get('/api/marketing/dashboard/conversion-rate?from=2026-01-01&to=2026-06-30')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.won)).toBe(5);
    expect(Number(res.body.data.lost)).toBe(2);
    expect(Number(res.body.data.total_closed)).toBe(7);
    expect(res.body.data.conversion_rate).toBe('71.43%');
  });

  // test-ep-6.2.1-b-013
  it('test-ep-6.2.1-b-013: Admin token on Marketing-only conversion-rate route returns 403', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/marketing/dashboard/conversion-rate')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This endpoint is restricted to Marketing Executive role');
  });

  // test-ep-6.2.1-b-014
  it('test-ep-6.2.1-b-014: No token returns 401', async () => {
    const res = await request(app).get('/api/marketing/dashboard/conversion-rate');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.2.1 — GET /marketing/followups/today', () => {

  // test-ep-6.2.1-b-015
  it("test-ep-6.2.1-b-015: ME fetches today's follow-ups sorted Hot>Warm>Cold — HTTP 200", async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({ rows: [{ count: 5 }] });
    query.mockResolvedValueOnce({
      rows: [
        { id: 'l1', lead_id: 'LD-2026-00042', company_name: 'Acme Corp', contact_person: 'Ravi', lead_quality: 'Hot',  next_followup_date: '2026-07-09T10:00:00Z', status: 'Contacted' },
        { id: 'l2', lead_id: 'LD-2026-00043', company_name: 'Beta Corp', contact_person: 'Sam',  lead_quality: 'Warm', next_followup_date: '2026-07-09T11:00:00Z', status: 'New' },
        { id: 'l3', lead_id: 'LD-2026-00044', company_name: 'Gamma Corp', contact_person: 'Dev', lead_quality: 'Cold', next_followup_date: '2026-07-09T12:00:00Z', status: 'New' },
      ],
    });

    const res = await request(app)
      .get('/api/marketing/followups/today?page=1&limit=20')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total_records).toBeDefined();
    expect(res.body.applied_filters).toBeDefined();
    expect(res.body.applied_filters.assigned_to).toBe('current_user');
    expect(res.body.applied_filters.next_followup_date).toBeDefined();
    if (res.body.data.length > 0) {
      expect(res.body.data[0].lead_quality).toBe('Hot');
    }
  });

  // test-ep-6.2.1-b-016
  it('test-ep-6.2.1-b-016: No follow-ups today — empty state — HTTP 200', async () => {
    mockProtect(me003Row);
    query.mockResolvedValueOnce({ rows: [{ count: 0 }] });
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/marketing/followups/today')
      .set('Authorization', `Bearer ${me003Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total_pages).toBe(0);
    expect(res.body.pagination.total_records).toBe(0);
  });

  // test-ep-6.2.1-b-017
  it('test-ep-6.2.1-b-017: Admin token on Marketing-only followups/today returns 403', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/marketing/followups/today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('This endpoint is restricted to Marketing Executive role');
  });

  // test-ep-6.2.1-b-018
  it('test-ep-6.2.1-b-018: No token returns 401', async () => {
    const res = await request(app).get('/api/marketing/followups/today');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

  // test-ep-6.2.1-b-019
  it('test-ep-6.2.1-b-019: Pagination metadata reflects correct total when followups exceed limit — HTTP 200', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({ rows: [{ count: 25 }] });
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: `l${i}`, lead_id: `LD-2026-0${i}`, company_name: `Company ${i}`,
      contact_person: `Person ${i}`, lead_quality: 'Hot',
      next_followup_date: '2026-07-09T10:00:00Z', status: 'Contacted',
    }));
    query.mockResolvedValueOnce({ rows });

    const res = await request(app)
      .get('/api/marketing/followups/today?page=1&limit=20')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(20);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total_pages).toBe(2);
    expect(res.body.pagination.total_records).toBe(25);
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.2.1 — GET /api/marketing/leads/:id (Lead Access Control)', () => {

  // test-ep-6.2.1-b-020
  it('test-ep-6.2.1-b-020: ME views their own assigned lead — HTTP 200', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({
      rows: [{
        id: ME_001_ID, lead_id: 'LD-2026-00042', company_name: 'Acme Corp',
        assigned_to: ME_001_ID, stage: 'Contacted', priority: 'Hot',
      }],
    });

    const res = await request(app)
      .get('/api/marketing/leads/11111111-1111-1111-1111-111111111111')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // test-ep-6.2.1-b-021
  it('test-ep-6.2.1-b-021: ME gets 403 when lead is assigned to another user', async () => {
    mockProtect(me001Row);
    const OTHER_USER = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    query.mockResolvedValueOnce({
      rows: [{
        id: '11111111-1111-1111-1111-111111111111', lead_id: 'LD-2026-00099',
        company_name: 'Other Corp', assigned_to: OTHER_USER,
        stage: 'New', priority: 'Warm',
      }],
    });

    const res = await request(app)
      .get('/api/marketing/leads/11111111-1111-1111-1111-111111111111')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied. Lead not assigned to you.');
  });

  // test-ep-6.2.1-b-022
  it('test-ep-6.2.1-b-022: No token returns 401', async () => {
    const res = await request(app)
      .get('/api/marketing/leads/11111111-1111-1111-1111-111111111111');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

  // test-ep-6.2.1-b-023
  it('test-ep-6.2.1-b-023: Non-existent lead returns 404', async () => {
    mockProtect(me001Row);
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/marketing/leads/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Lead not found');
  });

  // test-ep-6.2.1-b-024
  it('test-ep-6.2.1-b-024: Admin views any lead — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({
      rows: [{
        id: '11111111-1111-1111-1111-111111111111', lead_id: 'LD-2026-00099',
        company_name: 'Other Corp', assigned_to: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        stage: 'New', priority: 'Warm',
      }],
    });

    const res = await request(app)
      .get('/api/marketing/leads/11111111-1111-1111-1111-111111111111')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 3 — STORY-6.3.1 Export Lead Data
// ═══════════════════════════════════════════════════════════════════════════════

describe('STORY-6.3.1 — GET /admin/leads/export', () => {

  // test-ep-6.3.1-b-001
  it('test-ep-6.3.1-b-001: Admin exports filtered leads as CSV — HTTP 200 with correct headers and row count', async () => {
    mockProtect(adminRow);
    // Lead.findAllAdmin → count + data
    query.mockResolvedValueOnce({ rows: [{ count: '245' }] });
    const leads = Array.from({ length: 245 }, (_, i) => ({
      lead_id: `LD-${i}`, company_name: `Company ${i}`,
      category: 'Software Solutions', sub_category: 'CRM',
      lead_source: 'Website', stage: 'Contacted',
      assigned_to_name: 'Priya', estimated_value: '10000', created_at: '2026-01-15T00:00:00Z',
    }));
    query.mockResolvedValueOnce({ rows: leads });
    // AuditLog.create
    query.mockResolvedValueOnce({ rows: [{ id: 'audit-uuid-001' }] });

    const res = await request(app)
      .get('/api/admin/leads/export?format=csv&status=Contacted&quality=Hot&from=2026-01-01&to=2026-06-26')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/\.csv/);
    expect(res.headers['x-record-count']).toBe('245');
    expect(res.headers['x-audit-log-id']).toBeDefined();
  });

  // test-ep-6.3.1-b-002
  it('test-ep-6.3.1-b-002: Admin exports as Excel — HTTP 200 with correct content-type and X-Record-Count', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({ rows: [{ count: '62' }] });
    const leads = Array.from({ length: 62 }, (_, i) => ({
      lead_id: `LD-${i}`, company_name: `Company ${i}`,
      category: 'Software', sub_category: 'ERP',
      lead_source: 'Referral', stage: 'Won',
      assigned_to_name: 'Kumar', estimated_value: '50000', created_at: '2026-03-01T00:00:00Z',
    }));
    query.mockResolvedValueOnce({ rows: leads });
    query.mockResolvedValueOnce({ rows: [{ id: 'audit-uuid-002' }] });

    const res = await request(app)
      .get('/api/admin/leads/export?format=excel&status=Won&from=2026-01-01&to=2026-06-26')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.headers['x-record-count']).toBe('62');
  });

  // test-ep-6.3.1-b-003
  it('test-ep-6.3.1-b-003: Format not csv or excel returns 400', async () => {
    mockProtect(adminRow);

    const res = await request(app)
      .get('/api/admin/leads/export?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Format must be csv or excel');
  });

  // test-ep-6.3.1-b-004
  it('test-ep-6.3.1-b-004: No leads match filters returns 404 — Story MD', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/admin/leads/export?format=csv&status=Nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No leads found for the given filters');
  });

  // test-ep-6.3.1-b-006
  it('test-ep-6.3.1-b-006: Marketing Executive gets 403 on export endpoint', async () => {
    mockProtect(me001Row);

    const res = await request(app)
      .get('/api/admin/leads/export?format=csv')
      .set('Authorization', `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Export is restricted to Admin role');
  });

  // test-ep-6.3.1-b-007
  it('test-ep-6.3.1-b-007: No token returns 401', async () => {
    const res = await request(app).get('/api/admin/leads/export?format=csv');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('No token provided');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('STORY-6.3.1 — GET /admin/audit-log (Export Verification)', () => {

  // test-ep-6.3.1-b-008
  it('test-ep-6.3.1-b-008: Export action is logged in audit-log with actor, record_count, format, filter criteria — HTTP 200', async () => {
    mockProtect(adminRow);
    query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
    query.mockResolvedValueOnce({
      rows: [{
        id: '66a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5',
        user_id: ADMIN_ID,
        action: 'lead.exported',
        resource: 'lead',
        resourceId: 'bulk',
        ipAddress: '203.0.113.45',
        details: JSON.stringify({
          record_count: 245,
          format: 'csv',
          filters: { status: 'Contacted', quality: 'Hot', from: '2026-01-01', to: '2026-06-26' },
        }),
        createdAt: '2026-07-09T10:00:00Z',
        actor_name: 'Admin Kumar',
        actor_role: 'Admin',
        result: 'Success',
      }],
    });
    // enrichRow user lookup
    query.mockResolvedValueOnce({ rows: [{ name: 'Admin Kumar', role: 'Admin' }] });

    const res = await request(app)
      .get('/api/admin/audit-log?action=lead.exported&page=1&limit=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const entry = res.body.data[0];
    expect(entry.action).toBe('lead.exported');
    expect(entry.entity).toBe('lead');
    expect(entry.performed_by).toBeDefined();
    expect(entry.performed_by.role).toBe('Admin');
    expect(entry.ip_address).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.details).toBeDefined();
    expect(entry.details.record_count).toBeDefined();
    expect(entry.details.format).toBeDefined();
    expect(entry.details.filters).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total_records).toBe(1);
  });

});
