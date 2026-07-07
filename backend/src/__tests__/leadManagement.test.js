const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));
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

beforeEach(() => {
  mockQuery.mockReset();
});

afterAll(() => jest.restoreAllMocks());

// ============================================================
// STORY-2.1.1 Lead Creation — TEST-EP2-LEADS-001 to 014
// ============================================================

describe('API-1: POST /marketing/leads', () => {
  const NEW_LEAD = {
    id: 'e4c18495-e224-5b11-b652-c9559fc9c902',
    seq: 5,
    lead_id: 'LD-2026-00005',
    company_name: 'Supabase Systems',
    contact_person: 'Jane Doe',
    mobile_number: '9876543210',
    email: 'jane@supabase.com',
    website: 'https://supabase.com',
    city: 'San Francisco',
    lead_source: 'Website',
    category: 'd3b07384-d113-4a00-a541-b8448fb8b801',
    sub_category: 'e4c18495-e224-5b11-b652-c9559fc9c902',
    service_interested: ['Web Dev'],
    priority: 'Hot',
    estimated_value: 12000.00,
    assigned_to: MARKETING_USER.id,
    stage: 'New Lead',
    lead_status: 'New Lead',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  test('TEST-EP2-LEADS-001: Create lead with all valid fields — 201', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COALESCE(', () => ({ rows: [{ next_seq: 5 }] })],
      ['INSERT INTO leads', () => ({ rows: [NEW_LEAD] })],
      ['INSERT INTO lead_history', () => ({ rows: [] })],
      ['INSERT INTO audit_logs', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        company_name: 'Supabase Systems',
        contact_person: 'Jane Doe',
        mobile_number: '9876543210',
        lead_source: 'Website',
        category: 'd3b07384-d113-4a00-a541-b8448fb8b801',
        sub_category: 'e4c18495-e224-5b11-b652-c9559fc9c902',
        service_interested: ['Web Dev'],
        priority: 'Hot',
        estimated_value: 12000.00,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lead_id).toMatch(/^LD-\d{4}-\d{5}$/);
    expect(res.body.data.assigned_to).toBe(MARKETING_USER.id);
    expect(res.body.data.stage).toBe('New Lead');
    expect(res.body.data.lead_status).toBe('New Lead');
  });

  test('TEST-EP2-LEADS-002: Missing mandatory fields — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.company_name).toBe('Company Name is required');
    expect(res.body.contact_person).toBe('Contact Person is required');
    expect(res.body.mobile_number).toBe('Mobile Number is required');
    expect(res.body.lead_source).toBe('Lead Source is required');
    expect(res.body.category).toBe('Business Category is required');
    expect(res.body.priority).toBe('Priority is required');
  });

  test('TEST-EP2-LEADS-003: Invalid mobile format — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();

    const res1 = await request(app)
      .post('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        company_name: 'Test', contact_person: 'Test', mobile_number: '98765abcde',
        lead_source: 'Website', category: 'd3b07384-d113-4a00-a541-b8448fb8b801', priority: 'Hot',
      });
    expect(res1.status).toBe(400);
    expect(res1.body.mobile_number).toBe('Mobile Number must be exactly 10 numeric digits');

    const res2 = await request(app)
      .post('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        company_name: 'Test', contact_person: 'Test', mobile_number: '12345',
        lead_source: 'Website', category: 'd3b07384-d113-4a00-a541-b8448fb8b801', priority: 'Hot',
      });
    expect(res2.status).toBe(400);
    expect(res2.body.mobile_number).toBe('Mobile Number must be exactly 10 numeric digits');
  });

  test('TEST-EP2-LEADS-004: Invalid priority — 400', async () => {
    defaultQuery([['WHERE id = $1', () => ({ rows: [MARKETING_USER] })]]);
    const app = createTestApp();

    const res1 = await request(app)
      .post('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        company_name: 'Test', contact_person: 'Test', mobile_number: '9876543210',
        lead_source: 'Website', category: 'd3b07384-d113-4a00-a541-b8448fb8b801', priority: 'Ultra Hot',
      });
    expect(res1.status).toBe(400);
    expect(res1.body.priority).toBe('Priority must be one of: Hot, Warm, Cold');

    const res2 = await request(app)
      .post('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        company_name: 'Test', contact_person: 'Test', mobile_number: '9876543210',
        lead_source: 'Website', category: 'd3b07384-d113-4a00-a541-b8448fb8b801', priority: null,
      });
    expect(res2.status).toBe(400);
  });
});

describe('API-2: GET /marketing/leads/check-mobile', () => {
  test('TEST-EP2-LEADS-005: No duplicate — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT * FROM leads WHERE', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/check-mobile?mobile=9876543210')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(false);
  });

  test('TEST-EP2-LEADS-006: Duplicate found — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT * FROM leads WHERE', () => ({ rows: [{ lead_id: 'LD-2026-00001', mobile_number: '9998887776' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/check-mobile?mobile=9998887776')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(true);
    expect(res.body.leadId).toBe('LD-2026-00001');
  });
});

describe('API-3: GET /marketing/leads/check-email', () => {
  test('TEST-EP2-LEADS-007: No duplicate — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT * FROM leads WHERE', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/check-email?email=unique@company.com')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(false);
  });

  test('TEST-EP2-LEADS-008: Duplicate found — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT * FROM leads WHERE', () => ({ rows: [{ lead_id: 'LD-2026-00001', email: 'existing@company.com' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/check-email?email=existing@company.com')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(true);
    expect(res.body.leadId).toBe('LD-2026-00001');
  });
});

describe('API-4 to API-7: Admin reference data endpoints', () => {
  test('TEST-EP2-LEADS-009: GET /admin/lead-sources — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT id, name, status FROM lead_sources', () => ({
        rows: [
          { id: 1, name: 'Website', status: 'Active' },
          { id: 2, name: 'Referral', status: 'Active' },
        ],
      })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/lead-sources')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].name).toBe('Website');
  });

  test('TEST-EP2-LEADS-010: GET /admin/categories — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT id, category_name, status FROM business_categories', () => ({
        rows: [
          { id: 'd3b07384-d113-4a00-a541-b8448fb8b801', category_name: 'IT Services', status: 'Active' },
        ],
      })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/categories')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].category_name).toBe('IT Services');
  });

  test('TEST-EP2-LEADS-011: GET /admin/categories/:id/subcategories — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['WHERE id = $1', () => ({ rows: [{ id: 'd3b07384-d113-4a00-a541-b8448fb8b801', category_name: 'IT Services' }] })],
      ['SELECT id, sub_category_name, status FROM business_sub_categories', () => ({
        rows: [
          { id: 'e4c18495-e224-5b11-b652-c9559fc9c902', sub_category_name: 'Web Development', status: 'Active' },
        ],
      })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/categories/d3b07384-d113-4a00-a541-b8448fb8b801/sub-categories')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].sub_category_name).toBe('Web Development');
  });

  test('TEST-EP2-LEADS-012: GET /admin/services — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT id, name, status FROM services', () => ({
        rows: [
          { id: 1, name: 'App Development', status: 'Active' },
        ],
      })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/services')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].name).toBe('App Development');
  });
});

describe('API-8: GET /marketing/leads/:id', () => {
  test('TEST-EP2-LEADS-013: Retrieve lead details — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT l.*', () => ({
        rows: [{
          id: 'e4c18495-e224-5b11-b652-c9559fc9c902',
          seq: 5,
          lead_id: 'LD-2026-00005',
          company_name: 'Supabase Systems',
          contact_person: 'Jane Doe',
          mobile_number: '9876543210',
          email: 'jane@supabase.com',
          website: 'https://supabase.com',
          city: 'San Francisco',
          lead_source: 'Website',
          category: 'd3b07384-d113-4a00-a541-b8448fb8b801',
          sub_category: 'e4c18495-e224-5b11-b652-c9559fc9c902',
          service_interested: ['Web Dev'],
          priority: 'Hot',
          estimated_value: 12000.00,
          assigned_to: MARKETING_USER.id,
          assigned_to_name: 'Marketing User',
          stage: 'New Lead',
          lead_status: 'New Lead',
          created_at: '2026-06-30T10:00:00.000Z',
          updated_at: '2026-06-30T10:00:00.000Z',
        }],
      })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/e4c18495-e224-5b11-b652-c9559fc9c902')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lead_id).toBe('LD-2026-00005');
    expect(res.body.data.company_name).toBe('Supabase Systems');
    expect(res.body.data.priority).toBe('Hot');
    expect(res.body.data.stage).toBe('New Lead');
  });
});

describe('API-9: GET /marketing/leads/:id/lead-history', () => {
  test('TEST-EP2-LEADS-014: Retrieve lead history — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT l.*, u.name', () => ({
        rows: [{
          id: 'e4c18495-e224-5b11-b652-c9559fc9c902',
          lead_id: 'LD-2026-00005',
          assigned_to: MARKETING_USER.id,
        }],
      })],
      ['SELECT h.*, u.name', () => ({
        rows: [
          {
            id: 'history-1',
            lead_id: 'e4c18495-e224-5b11-b652-c9559fc9c902',
            field_name: 'lead_created',
            change_summary: `Lead Created by Marketing User on ${new Date().toISOString()}`,
            changed_by: MARKETING_USER.id,
            changed_by_name: 'Marketing User',
            created_at: '2026-06-30T10:00:00.000Z',
          },
        ],
      })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/e4c18495-e224-5b11-b652-c9559fc9c902/lead-history')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].field_name).toBe('lead_created');
    expect(res.body.data[0].change_summary).toContain('Lead Created by');
  });
});

describe('API-10: GET /marketing/leads', () => {
  const MOCK_LEADS = [
    { id: 'lead-1', lead_id: 'LD-2026-00001', company_name: 'Alpha Corp', contact_person: 'Alice', mobile_number: '9111111111', priority: 'Hot', stage: 'New Lead', estimated_value: 50000, assigned_to: MARKETING_USER.id, assigned_to_name: 'Marketing User', created_at: '2026-06-01T00:00:00.000Z' },
    { id: 'lead-2', lead_id: 'LD-2026-00002', company_name: 'Beta Inc', contact_person: 'Bob', mobile_number: '9222222222', priority: 'Warm', stage: 'New Lead', estimated_value: 30000, assigned_to: MARKETING_USER.id, assigned_to_name: 'Marketing User', created_at: '2026-06-02T00:00:00.000Z' },
    { id: 'lead-3', lead_id: 'LD-2026-00003', company_name: 'Gamma Ltd', contact_person: 'Charlie', mobile_number: '9333333333', priority: 'Cold', stage: 'Contacted', estimated_value: 10000, assigned_to: MARKETING_USER.id, assigned_to_name: 'Marketing User', created_at: '2026-06-03T00:00:00.000Z' },
  ];

  test('TEST-EP2-LEADS-015: ME retrieves only own assigned leads — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '2' }] })],
      ['FROM leads l', () => ({ rows: MOCK_LEADS.slice(0, 2) })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.totalCount).toBe(2);
  });

  test('TEST-EP2-LEADS-016: Admin retrieves all leads — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['FROM leads l', () => ({ rows: MOCK_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.totalCount).toBe(3);
  });

  test('TEST-EP2-LEADS-017: Search leads by text query — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['FROM leads l', () => ({ rows: [MOCK_LEADS[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads?search=Alpha')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].company_name).toContain('Alpha');
  });

  test('TEST-EP2-LEADS-018: Filter by priority and stage — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
      ['FROM leads l', () => ({ rows: [MOCK_LEADS[0]] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads?priority=Hot&stage=New%20Lead')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].priority).toBe('Hot');
    expect(res.body.data[0].stage).toBe('New Lead');
  });

  test('TEST-EP2-LEADS-019: Sort by estimated value descending — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
      ['FROM leads l', () => ({ rows: [...MOCK_LEADS].sort((a, b) => b.estimated_value - a.estimated_value) })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads?sortBy=estimated_value&sortOrder=desc')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].estimated_value).toBe(50000);
  });

  test('TEST-EP2-LEADS-020: Paginated leads retrieval Page 2 — 200', async () => {
    defaultQuery([
      ['WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['COUNT(*)', () => ({ rows: [{ count: '65' }] })],
      ['FROM leads l', () => ({ rows: MOCK_LEADS })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads?page=2&limit=25')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.totalCount).toBe(65);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
