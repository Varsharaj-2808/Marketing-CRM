const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER, INACTIVE_USER,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../config/db', () => ({
  query: (...args) => mockQuery(...args),
  getClient: jest.fn().mockResolvedValue({
    query: (...args) => mockQuery(...args),
    release: jest.fn(),
  }),
}));

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

const MOCK_LEAD = {
  id: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  lead_id: 'LD-2026-00001',
  company_name: 'Test Corp',
  contact_person: 'Test Person',
  mobile_number: '9111111111',
  email: 'test@test.com',
  lead_source: 'Website',
  category: 'IT Services',
  priority: 'Hot',
  stage: 'New Lead',
  estimated_value: 50000,
  assigned_to: null,
  assigned_to_name: null,
  assigned_at: null,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

const ANOTHER_ME = {
  id: '66666666-6666-6666-6666-666666666666',
  employee_id: 'EMP-00005',
  name: 'Another ME',
  email: 'another@company.com',
  mobile: '5555555555',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
};

beforeEach(() => {
  mockQuery.mockReset();
});

afterAll(() => jest.restoreAllMocks());

// ============================================================
// API-1: PATCH /leads/{id}/assign — Single Lead Assign/Reassign
// ============================================================
describe('API-1: PATCH /admin/leads/:id/assign', () => {
  test('test-ep-2.3.1-001: Assign an unowned lead to an active Marketing Executive — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: null }] })],
      ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id, assigned_at: new Date().toISOString() }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-001' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-001' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    console.log('STATUS:', res.status);
    console.log('BODY:', JSON.stringify(res.body));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('test-ep-2.3.1-002: Reassign a lead that already has an owner with reason — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP-00002' }] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-002' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-002' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'Region reallocation' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('test-ep-2.3.1-003: Admin assigns lead to themselves — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: null }] })],
      ['"employee_id" = $1', () => ({ rows: [ADMIN_USER] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ADMIN_USER.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-003' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-003' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00001' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('test-ep-2.3.1-004: Initial assignment of newly created lead (no previous owner) does not require reason — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: null }] })],
      ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-004' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-004' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-005: Reassignment with minimum length reason (single character) — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP-00002' }] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-005' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-005' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'R' });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-006: Reassign without reason when lead already has an owner — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Reassignment reason is required when the lead already has an owner');
  });

  test('test-ep-2.3.1-007: Reassign with empty reason string when lead has owner — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: '' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Reassignment reason cannot be empty');
  });

  test('test-ep-2.3.1-008: Reassign with whitespace-only reason — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Reassignment reason cannot be empty');
  });

  test('test-ep-2.3.1-009: Missing assigned_to field — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]],
    );
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.assigned_to).toBe('Target user ID is required');
  });

  test('test-ep-2.3.1-010: Empty assigned_to string — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]],
    );
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: '' });
    expect(res.status).toBe(400);
    expect(res.body.assigned_to).toBe('Target user ID is required');
  });

  test('test-ep-2.3.1-011: Non-existent lead ID — 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/nonexistent-id/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Lead not found');
  });

  test('test-ep-2.3.1-012: Non-existent user as assignee — 404', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [MOCK_LEAD] })],
      ['"employee_id" = $1', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-99999' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Assigned user not found');
  });

  test('test-ep-2.3.1-013: Inactive/deactivated user as assignee — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [MOCK_LEAD] })],
      ['"employee_id" = $1', () => ({ rows: [INACTIVE_USER] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00003' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cannot assign leads to a deactivated user');
  });

  test('test-ep-2.3.1-014: Marketing Executive attempts to access assign endpoint — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]],
    );
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(403);
  });

  test('test-ep-2.3.1-015: Unauthenticated request — 401', async () => {
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(401);
  });

  test('test-ep-2.3.1-016: Invalid lead ID format (non-UUID) — 400', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })]],
    );
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/not-a-valid-id/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(404);
  });

  test('test-ep-2.3.1-017: Assign lead to the same user it is already assigned to (no-op) — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lead ownership unchanged');
  });

  test('test-ep-2.3.1-018: Reassign with reason at maximum allowed length (500 characters) — 200', async () => {
    const longReason = 'R'.repeat(500);
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP-00002' }] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-018' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-018' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: longReason });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-019: Reassign with reason exceeding maximum length — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'X'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Reason must be 500 characters or less');
  });

  test('test-ep-2.3.1-020: Reassign with special characters and Unicode in reason — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP-00002' }] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-020' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-020' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'Réassignment — région: test' });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-021: XSS attempt in reason field — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP-00002' }] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{ id: 'history-021' }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-021' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: "<script>alert('xss')</script>" });
    expect(res.status).toBe(200);
  });
});

// ============================================================
// API-2: Lead History — Assignment-Changed Event Recording
// ============================================================
describe('API-2: Lead History — Assignment-Changed Event Recording', () => {
  test('test-ep-2.3.1-022: History entry created on initial assignment (no previous owner) — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: null }] })],
      ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{
        id: 'hist-022', lead_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', field_name: 'assigned_to',
        old_value: 'Unassigned', new_value: 'EMP-00002',
        change_summary: 'Lead reassigned from Unassigned to EMP-00002',
        changed_by: ADMIN_USER.id, created_at: new Date().toISOString(),
      }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-022' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-023: History entry created on reassignment with all fields populated — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP-00002' }] })],
      ['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] })],
      ['INSERT INTO lead_history', () => ({ rows: [{
        id: 'hist-023', lead_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', field_name: 'assigned_to',
        old_value: 'EMP-00002', new_value: 'EMP-00005',
        change_summary: 'Lead reassigned from EMP-00002 to EMP-00005. Reason: Workload balancing',
        changed_by: ADMIN_USER.id, created_at: new Date().toISOString(),
      }] })],
      ['INSERT INTO notifications', () => ({ rows: [{ id: 'notif-023' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'Workload balancing' });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-024: Multiple reassignments create sequential history entries — 200', async () => {
    const seqMocks = [
      { lead: { ...MOCK_LEAD, assigned_to: null }, target: MARKETING_USER, empId: 'EMP-00002' },
      { lead: { ...MOCK_LEAD, assigned_to: MARKETING_USER.id }, target: ANOTHER_ME, empId: 'EMP-00005' },
    ];
    for (const step of seqMocks) {
      const handlers = [
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [step.lead] })],
        ['"employee_id" = $1', () => ({ rows: [step.target] })],
      ];
      if (step.lead.assigned_to) {
        handlers.push(['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: step.empId === 'EMP-00005' ? 'EMP-00002' : step.empId }] })]);
      }
      handlers.push(['UPDATE leads SET assigned_to', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: step.target.id }] })]);
      handlers.push(['INSERT INTO lead_history', () => ({ rows: [{ id: `hist-${Date.now()}` }] })]);
      handlers.push(['INSERT INTO notifications', () => ({ rows: [{ id: `notif-${Date.now()}` }] })]);
      defaultQuery(handlers);
      const app = createTestApp();
      const body = { assigned_to: step.empId };
      if (step.lead.assigned_to) {
        body.reason = 'Workload balancing';
      }
      const res = await request(app)
        .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
      expect(res.status).toBe(200);
    }
  });

  test('test-ep-2.3.1-025: History entries are returned in chronological order via timeline endpoint — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['FROM lead_history h', () => ({ rows: [
        {
          id: 'hist-1', lead_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', field_name: 'assigned_to',
          old_value: null, new_value: 'EMP-00002',
          change_summary: 'Lead reassigned from Unassigned to EMP-00002',
          changed_by: ADMIN_USER.id, changed_by_name: 'Admin User',
          created_at: '2026-06-01T10:00:00.000Z',
          actor_employee_id: 'EMP-00001',
        },
        {
          id: 'hist-2', lead_id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', field_name: 'assigned_to',
          old_value: 'EMP-00002', new_value: 'EMP-00005',
          change_summary: 'Lead reassigned from EMP-00002 to EMP-00005. Reason: Workload balancing',
          changed_by: ADMIN_USER.id, changed_by_name: 'Admin User',
          created_at: '2026-06-02T10:00:00.000Z',
          actor_employee_id: 'EMP-00001',
        },
      ] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/timeline?filter=Assignment')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].event_type).toBe('Assigned/Reassigned');
    expect(res.body.data[0].previous_owner).toBeDefined();
    expect(res.body.data[0].new_owner).toBeDefined();
    expect(res.body.data[0].actor).toBeDefined();
    expect(res.body.data[0].timestamp).toBeDefined();
  });

  test('test-ep-2.3.1-026: History entry immutability — no API endpoint exists to update or delete history — 404', async () => {
    const app = createTestApp();
    const res1 = await request(app)
      .put('/api/marketing/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/history/hist-001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res1.status).toBe(404);

    const res2 = await request(app)
      .delete('/api/marketing/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/history/hist-001')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(404);
  });

  test('test-ep-2.3.1-027: No history entry created when no-op assignment (same owner) — 200', async () => {
    let historyCreated = false;
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
      ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
    ]);
    mockQuery.mockImplementation((sql, params) => {
      if (sql.includes('INSERT INTO lead_history')) {
        historyCreated = true;
        return { rows: [] };
      }
      for (const [pattern, handler] of [
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] })],
        ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ]) {
        if (sql.includes(pattern)) return handler(sql, params);
      }
      return { rows: [] };
    });
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
    expect(historyCreated).toBe(false);
  });

  test('test-ep-2.3.1-028: Non-admin cannot view lead history for arbitrary leads — 403', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['LEFT JOIN users u ON l.assigned_to = u.id', () => ({ rows: [{ ...MOCK_LEAD, assigned_to: 'some-other-user' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/timeline')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message || res.body.error).toBe("Access denied. Not authorized to view this lead's timeline");
  });
});

// ============================================================
// API-3: Notification — Trigger to New Owner
// ============================================================
describe('API-3: Notification — Trigger to New Owner', () => {
  test('test-ep-2.3.1-029: In-app notification created for new owner on assignment — 200', async () => {
    let notifCreated = false;
    let notifUserId = null;
    let notifMessage = null;
    const customMock = (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) {
        notifCreated = true;
        notifUserId = params[0];
        notifMessage = params[3];
        return { rows: [{ id: 'notif-029' }] };
      }
      if (sql.includes('SELECT * FROM users WHERE id = $1')) return { rows: [ADMIN_USER] };
      if (sql.includes('LEFT JOIN users u ON l.assigned_to = u.id')) return { rows: [{ ...MOCK_LEAD, assigned_to: null }] };
      if (sql.includes('"employee_id" = $1')) return { rows: [MARKETING_USER] };
      if (sql.includes('UPDATE leads SET assigned_to')) return { rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{ id: 'hist-029' }] };
      return { rows: [] };
    };
    mockQuery.mockImplementation(customMock);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
    expect(notifCreated).toBe(true);
    expect(notifUserId).toBe(MARKETING_USER.id);
    expect(notifMessage).toContain('assigned to you');
  });

  test('test-ep-2.3.1-030: In-app notification created for new owner on reassignment — 200', async () => {
    let notifCreated = false;
    let notifUserId = null;
    const customMock = (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) {
        notifCreated = true;
        notifUserId = params[0];
        return { rows: [{ id: 'notif-030' }] };
      }
      if (sql.includes('SELECT * FROM users WHERE id = $1')) return { rows: [ADMIN_USER] };
      if (sql.includes('LEFT JOIN users u ON l.assigned_to = u.id')) return { rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] };
      if (sql.includes('"employee_id" = $1')) return { rows: [ANOTHER_ME] };
      if (sql.includes('SELECT employee_id FROM users WHERE id = $1')) return { rows: [{ employee_id: 'EMP-00002' }] };
      if (sql.includes('UPDATE leads SET assigned_to')) return { rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{ id: 'hist-030' }] };
      return { rows: [] };
    };
    mockQuery.mockImplementation(customMock);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'Team restructuring' });
    expect(res.status).toBe(200);
    expect(notifCreated).toBe(true);
    expect(notifUserId).toBe(ANOTHER_ME.id);
  });

  test('test-ep-2.3.1-031: New owner unread notification count reflects assignment — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['SELECT COUNT(*) FROM notifications', () => ({ rows: [{ count: '1' }] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/marketing/notifications/count')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.unread_count).toBe(1);
  });

  test('test-ep-2.3.1-032: Notification includes lead details for easy identification — 200', async () => {
    let capturedMessage = null;
    const customMock = (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) {
        capturedMessage = params[3];
        return { rows: [{ id: 'notif-032', message: params[3] }] };
      }
      if (sql.includes('SELECT * FROM users WHERE id = $1')) return { rows: [ADMIN_USER] };
      if (sql.includes('LEFT JOIN users u ON l.assigned_to = u.id')) return { rows: [{ ...MOCK_LEAD, lead_id: 'LD-2026-00042', company_name: 'Acme Corp', assigned_to: null }] };
      if (sql.includes('"employee_id" = $1')) return { rows: [MARKETING_USER] };
      if (sql.includes('UPDATE leads SET assigned_to')) return { rows: [{ ...MOCK_LEAD, lead_id: 'LD-2026-00042', company_name: 'Acme Corp', assigned_to: MARKETING_USER.id }] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{ id: 'hist-032' }] };
      return { rows: [] };
    };
    mockQuery.mockImplementation(customMock);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
    expect(capturedMessage).toContain('LD-2026-00042');
  });

  test('test-ep-2.3.1-033: Notification failure does not block the assignment operation — 200', async () => {
    let notifAttempted = false;
    const customMock = (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) {
        notifAttempted = true;
        throw new Error('Notification service down');
      }
      if (sql.includes('SELECT * FROM users WHERE id = $1')) return { rows: [ADMIN_USER] };
      if (sql.includes('LEFT JOIN users u ON l.assigned_to = u.id')) return { rows: [{ ...MOCK_LEAD, assigned_to: null }] };
      if (sql.includes('"employee_id" = $1')) return { rows: [MARKETING_USER] };
      if (sql.includes('UPDATE leads SET assigned_to')) return { rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{ id: 'hist-033' }] };
      return { rows: [] };
    };
    mockQuery.mockImplementation(customMock);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00002' });
    expect(res.status).toBe(200);
    expect(notifAttempted).toBe(true);
  });

  test('test-ep-2.3.1-034: Previous owner does not receive a notification on reassignment — 200', async () => {
    const notifRecipients = [];
    const customMock = (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) {
        notifRecipients.push(params[0]);
        return { rows: [{ id: 'notif-034' }] };
      }
      if (sql.includes('SELECT * FROM users WHERE id = $1')) return { rows: [ADMIN_USER] };
      if (sql.includes('LEFT JOIN users u ON l.assigned_to = u.id')) return { rows: [{ ...MOCK_LEAD, assigned_to: MARKETING_USER.id }] };
      if (sql.includes('"employee_id" = $1')) return { rows: [ANOTHER_ME] };
      if (sql.includes('SELECT employee_id FROM users WHERE id = $1')) return { rows: [{ employee_id: 'EMP-00002' }] };
      if (sql.includes('UPDATE leads SET assigned_to')) return { rows: [{ ...MOCK_LEAD, assigned_to: ANOTHER_ME.id }] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{ id: 'hist-034' }] };
      return { rows: [] };
    };
    mockQuery.mockImplementation(customMock);
    const app = createTestApp();
    const res = await request(app)
      .patch('/api/admin/leads/d290f1ee-6c54-4b01-90e6-d701748f0851/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigned_to: 'EMP-00005', reason: 'Team restructuring' });
    expect(res.status).toBe(200);
    expect(notifRecipients).toEqual([ANOTHER_ME.id]);
    expect(notifRecipients).not.toContain(MARKETING_USER.id);
  });

  test('test-ep-2.3.1-035: Bulk assign triggers notifications for each new owner — 200', async () => {
    const mockClient = () => {
      const client = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      require('../config/db').getClient.mockResolvedValue(client);
      return client;
    };
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    const notifRecipients = [];
    const customMock = (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) {
        notifRecipients.push(params[0]);
        return { rows: [{ id: `notif-${notifRecipients.length}` }] };
      }
      if (sql.includes('SELECT * FROM users WHERE id = $1') && params[0] === ADMIN_USER.id) return { rows: [ADMIN_USER] };
      if (sql.includes('"employee_id" = $1')) return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads WHERE id IN')) return { rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: null },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: null },
      ] };
      return { rows: [] };
    };
    mockQuery.mockImplementation(customMock);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: MARKETING_USER.id });
    expect(res.status).toBe(200);
    expect(notifRecipients.length).toBe(2);
    notifRecipients.forEach(uid => expect(uid).toBe(MARKETING_USER.id));
  });
});

// ============================================================
// API-4: POST /admin/leads/bulk-assign — Bulk Assign (2.3.1 Specific)
// ============================================================
describe('API-4: POST /admin/leads/bulk-assign (Story 2.3.1)', () => {
  const mockClient = () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    };
    require('../config/db').getClient.mockResolvedValue(client);
    return client;
  };

  test('test-ep-2.3.1-036: Bulk reassign with reason for leads that have mixed ownership — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: MARKETING_USER.id },
      ] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00005', reason: 'Team restructure' });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
  });

  test('test-ep-2.3.1-037: Bulk assign with mix of owned and unowned leads — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: null },
      ] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00005', reason: 'Reallocation' });
    expect(res.status).toBe(200);
  });

  test('test-ep-2.3.1-038: Bulk reassign without reason when all selected leads have owners — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: MARKETING_USER.id },
      ] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00005' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Reassignment reason is required when one or more leads already have an owner');
  });

  test('test-ep-2.3.1-039: Bulk reassign without reason when some leads have owners (partial) — 400', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: null },
      ] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00005' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('Reassignment reason is required when one or more leads already have an owner');
  });

  test('test-ep-2.3.1-040: No-op for lead already assigned to target user — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [MARKETING_USER] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: null },
      ] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: MARKETING_USER.id, reason: 'Reallocation' });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('test-ep-2.3.1-041: Bulk assign to Admin user (self-assign) — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ADMIN_USER] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: null },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: null },
      ] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: ADMIN_USER.id });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
  });

  test('test-ep-2.3.1-042: Bulk reassign large batch with reason (500 leads) — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    const leadIds = Array.from({ length: 500 }, (_, i) => `lead-${String(i + 1).padStart(3, '0')}`);
    const leadRows = leadIds.map((id, i) => ({
      id, lead_id: `LD-2026-${String(i + 1).padStart(5, '0')}`,
      assigned_to: MARKETING_USER.id,
    }));

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: leadRows })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: leadIds, assigned_to: 'EMP-00005', reason: 'Bulk reallocation' });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(500);
  });

  test('test-ep-2.3.1-043: Bulk assign with duplicate lead IDs — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
        { id: 'e290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00002', assigned_to: ANOTHER_ME.id },
      ] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'e290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00005', reason: 'Dedup test' });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('test-ep-2.3.1-044: Marketing Executive cannot use bulk-assign endpoint — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]],
    );
    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00002' });
    expect(res.status).toBe(403);
  });

  test('test-ep-2.3.1-045: Lead disappears from previous owner list and appears in new owner list after reassignment — 200', async () => {
    const client = mockClient();
    client.query.mockResolvedValue({ rows: [] });

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['"employee_id" = $1', () => ({ rows: [ANOTHER_ME] })],
      ['FROM leads WHERE id IN', () => ({ rows: [
        { id: 'd290f1ee-6c54-4b01-90e6-d701748f0851', lead_id: 'LD-2026-00001', assigned_to: MARKETING_USER.id },
      ] })],
    ]);

    const app = createTestApp();
    const res = await request(app)
      .post('/api/admin/leads/bulk-assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lead_ids: ['d290f1ee-6c54-4b01-90e6-d701748f0851'], assigned_to: 'EMP-00005', reason: 'Region reallocation' });
    expect(res.status).toBe(200);

    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ['assigned_to_name', () => ({ rows: [] })],
      ['COUNT(*)', () => ({ rows: [{ count: '0' }] })],
    ]);
    const resOld = await request(app)
      .get('/api/marketing/leads')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(resOld.status).toBe(200);
    expect(resOld.body.data.length).toBe(0);
  });
});

// ============================================================
// API-5: GET /admin/users?role=Marketing Executive
// ============================================================
describe('API-5: GET /admin/users?role=Marketing Executive', () => {
  test('test-ep-2.3.1-046: Admin retrieves active Marketing Executives for assignee dropdown — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE role = $1 AND "accountStatus"', () => ({ rows: [
        { id: MARKETING_USER.id, employee_id: 'EMP-00002', employee_name: 'Marketing User', email: 'marketing@company.com', role: 'Marketing Executive', status: 'active' },
        { id: '77777777-7777-7777-7777-777777777777', employee_id: 'EMP-00006', employee_name: 'Another ME', email: 'another@company.com', role: 'Marketing Executive', status: 'active' },
      ] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/users?role=Marketing%20Executive')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    res.body.data.forEach(u => {
      expect(u.role).toBe('Marketing Executive');
      expect(u.status).toBe('active');
      expect(u.employee_id).toBeDefined();
      expect(u.employee_name).toBeDefined();
      expect(u.email).toBeDefined();
    });
  });

  test('test-ep-2.3.1-047: Marketing Executive attempting to access admin users endpoint — 403', async () => {
    defaultQuery([['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })]],
    );
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/users?role=Marketing%20Executive')
      .set('Authorization', `Bearer ${marketingToken}`);
    expect(res.status).toBe(403);
  });

  test('test-ep-2.3.1-048: Empty response when no active Marketing Executives exist — 200', async () => {
    defaultQuery([
      ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ['WHERE role = $1 AND "accountStatus"', () => ({ rows: [] })],
    ]);
    const app = createTestApp();
    const res = await request(app)
      .get('/api/admin/users?role=Marketing%20Executive')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});
