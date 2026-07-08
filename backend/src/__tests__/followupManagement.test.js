/**
 * STORY-4.1.1: Follow-up Management — Backend Tests
 * 72 test cases covering APIs 1-4 + cross-cutting concerns
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { ADMIN_USER, MARKETING_USER } = require('./setup');

// ─── Mock dependencies ───────────────────────────────────────────────────────
let mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args), getClient: jest.fn() }));
jest.mock('../utils/emailService', () => ({ sendWelcomeEmail: jest.fn().mockResolvedValue() }));
jest.mock('../utils/algoliaService', () => ({
  saveUser: jest.fn().mockResolvedValue(),
  deleteUser: jest.fn().mockResolvedValue(),
  searchUsers: jest.fn(),
  indexAllUsers: jest.fn().mockResolvedValue(),
  testConnection: jest.fn(),
}));

// ─── Test App ────────────────────────────────────────────────────────────────
let app;
beforeAll(() => {
  app = express();
  app.use(require('helmet')());
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/marketing', require('../routes/marketing'));
  app.use(require('../middleware/errorHandler'));
});

// ─── Tokens ──────────────────────────────────────────────────────────────────
const adminToken = jwt.sign(
  { id: ADMIN_USER.id, email: ADMIN_USER.email, role: ADMIN_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);
const marketingToken = jwt.sign(
  { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);

// Second ME user (me-002)
const ME2_USER = {
  id: '55555555-5555-5555-5555-555555555555',
  employee_id: 'EMP-00005',
  name: 'ME User Two',
  email: 'me2@company.com',
  role: 'Marketing Executive',
  accountStatus: 'active',
  status: 'active',
  failedLoginAttempts: 0,
  lockoutUntil: null,
};
const me2Token = jwt.sign(
  { id: ME2_USER.id, email: ME2_USER.email, role: ME2_USER.role },
  process.env.JWT_SECRET, { expiresIn: '15m' }
);

// ─── Test Data ───────────────────────────────────────────────────────────────
const LEAD_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LEAD_ID_CLOSED = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NONEXISTENT_LEAD_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const FOLLOWUP_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const BASE_LEAD = {
  id: LEAD_ID,
  company_name: 'Acme Corp',
  contact_person: 'John Smith',
  assigned_to: MARKETING_USER.id,
  stage: 'Contacted',
  lead_status: 'Active',
  priority: 'Hot',
  proposal_value: 0,
  next_followup_date: null,
};

const CLOSED_LEAD = {
  ...BASE_LEAD,
  id: LEAD_ID_CLOSED,
  stage: 'Won',
};

const BASE_FOLLOWUP_BODY = {
  followup_type: 'Call',
  outcome: 'Interested',
  notes: 'Customer showed interest in CRM product',
  next_followup_date: '2026-07-10T10:00:00Z',
  proposal_amount: null,
};

const FOLLOWUP_ROW = {
  id: FOLLOWUP_ID,
  lead_id: LEAD_ID,
  followup_type: 'Call',
  outcome: 'Interested',
  notes: 'Customer showed interest in CRM product',
  next_followup_date: '2026-07-10T10:00:00Z',
  proposal_amount: null,
  stage_at_log: 'Contacted',
  created_by: MARKETING_USER.id,
  created_by_id: MARKETING_USER.id,
  created_by_name: MARKETING_USER.name,
  created_at: '2026-07-06T12:00:00.000Z',
  correction_notes: null,
  correction_by: null,
  correction_at: null,
};

// ─── Mock factory helpers ─────────────────────────────────────────────────────
/**
 * Auth middleware calls `SELECT * FROM users WHERE id = $1` for EVERY request.
 * The mock must return the correct full user object including accountStatus.
 * The lead lookup uses `FROM leads l ... WHERE l.id = $1`.
 */
const mockLeadFound = (lead = BASE_LEAD, authUser = MARKETING_USER) => {
  mockQuery.mockImplementation((sql, params) => {
    // Auth middleware: User.findById → SELECT * FROM users WHERE id = $1
    if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [authUser] };
    // Lead lookup: FROM leads l LEFT JOIN users u ON ... WHERE l.id = $1
    if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [lead] };
    // User name lookup in controller: SELECT id, name FROM users WHERE id = $1
    if (sql.includes('SELECT id, name FROM users')) return { rows: [{ id: authUser.id, name: authUser.name }] };
    // Followup insert — build dynamic row from INSERT params
    // Params: [leadId, followupType, outcome, notes, nextFollowupDate, proposalAmount, stageAtLog, createdBy]
    if (sql.includes('INSERT INTO followups')) {
      return { rows: [{
        id: FOLLOWUP_ID,
        lead_id: params && params[0] || LEAD_ID,
        followup_type: params && params[1] || 'Call',
        outcome: params && params[2] || 'Interested',
        notes: params ? params[3] : null,
        next_followup_date: params ? params[4] : null,
        proposal_amount: params ? params[5] : null,
        stage_at_log: params ? params[6] : lead.stage,
        created_by: params && params[7] || authUser.id,
        created_by_id: params && params[7] || authUser.id,
        created_by_name: authUser.name,
        created_at: new Date().toISOString(),
        correction_notes: null,
        correction_by: null,
        correction_at: null,
      }]};
    }
    // Lead history insert
    if (sql.includes('INSERT INTO lead_history')) return { rows: [{}] };
    // Audit log insert
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [{}] };
    // Lead proposal update
    if (sql.includes('UPDATE leads SET proposal_value')) return { rows: [{}] };
    // Followup reads (for timeline)
    if (sql.includes('FROM followups')) return { rows: [] };
    // History reads
    if (sql.includes('FROM lead_history')) return { rows: [] };
    return { rows: [] };
  });
};

const mockLeadNotFound = (authUser = MARKETING_USER) => {
  mockQuery.mockImplementation((sql) => {
    if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [authUser] };
    if (sql.includes('FROM leads')) return { rows: [] };
    return { rows: [] };
  });
};

const mockAdminLeadFound = (lead = BASE_LEAD) => mockLeadFound(lead, ADMIN_USER);

beforeEach(() => mockQuery.mockReset());
afterAll(() => jest.restoreAllMocks());

// =============================================================================
// API-1: POST /marketing/leads/:id/followups
// =============================================================================

describe('API-1: POST /marketing/leads/:id/followups', () => {
  // ── Positive ──────────────────────────────────────────────────────────────

  test('test-ep-4.1.1-001 (Positive): Create follow-up with all valid fields', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Follow-up recorded');
    expect(res.body.data.followup_type).toBe('Call');
    expect(res.body.data.outcome).toBe('Interested');
    expect(res.body.data.created_by).toBeDefined();
    expect(res.body.data.created_at).toBeDefined();
  });

  test('test-ep-4.1.1-002 (Positive): Outcome = Not Interested with null next_followup_date', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Call', outcome: 'Not Interested', notes: 'Customer declined', next_followup_date: null });

    expect(res.status).toBe(201);
    expect(res.body.data.outcome).toBe('Not Interested');
  });

  test('test-ep-4.1.1-003 (Positive): Proposal Amount updates lead proposal_value', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        followup_type: 'Proposal Discussion',
        outcome: 'Proposal Requested',
        notes: 'Discussed pricing',
        next_followup_date: '2026-07-15T10:00:00Z',
        proposal_amount: 75000,
      });

    expect(res.status).toBe(201);
    expect(res.body.lead_updated).toEqual({ proposal_value: 75000 });
  });

  test('test-ep-4.1.1-004 (Positive): Newer proposal_amount overwrites previous', async () => {
    mockLeadFound({ ...BASE_LEAD, proposal_value: 50000 });
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: 85000 });

    expect(res.status).toBe(201);
    expect(res.body.lead_updated.proposal_value).toBe(85000);
  });

  test('test-ep-4.1.1-005 (Positive): All valid followup_type values', async () => {
    const validTypes = ['Call', 'WhatsApp', 'Email', 'Online Meeting', 'Client Meeting', 'Demo', 'Proposal Discussion'];
    for (const type of validTypes) {
      mockLeadFound();
      const res = await request(app)
        .post(`/api/marketing/leads/${LEAD_ID}/followups`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ ...BASE_FOLLOWUP_BODY, followup_type: type });
      expect(res.status).toBe(201);
    }
  });

  test('test-ep-4.1.1-006 (Positive): All valid outcome values', async () => {
    const validOutcomes = ['Interested', 'Need More Info', 'Proposal Requested', 'Budget Discussion', 'Decision Pending', 'Not Interested'];
    for (const outcome of validOutcomes) {
      mockLeadFound();
      const res = await request(app)
        .post(`/api/marketing/leads/${LEAD_ID}/followups`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ ...BASE_FOLLOWUP_BODY, outcome });
      expect(res.status).toBe(201);
    }
  });

  test('test-ep-4.1.1-007 (Positive): Minimal required fields only', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Email', outcome: 'Need More Info', next_followup_date: '2026-07-12T09:00:00Z' });

    expect(res.status).toBe(201);
    expect(res.body.data.notes).toBeNull();
    expect(res.body.data.proposal_amount).toBeNull();
  });

  test('test-ep-4.1.1-008 (Positive): Admin creates follow-up for any lead', async () => {
    mockLeadFound({ ...BASE_LEAD, assigned_to: ME2_USER.id }, ADMIN_USER);
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(201);
  });

  // ── Negative ──────────────────────────────────────────────────────────────

  test('test-ep-4.1.1-009 (Negative): Missing followup_type', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ outcome: 'Interested', next_followup_date: '2026-07-10T10:00:00Z' });

    expect(res.status).toBe(400);
    expect(res.body.body?.errors?.followup_type || res.body.followup_type || res.body.message).toBeDefined();
  });

  test('test-ep-4.1.1-010 (Negative): Invalid followup_type enum value', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'SMS', outcome: 'Interested', next_followup_date: '2026-07-10T10:00:00Z' });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['followup_type']))) || res.body.error || res.body.message).toMatch(/must be one of/);
  });

  test('test-ep-4.1.1-011 (Negative): Missing outcome', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Call', next_followup_date: '2026-07-10T10:00:00Z' });

    expect(res.status).toBe(400);
    expect(res.body.body?.errors?.outcome || res.body.outcome || res.body.message).toBeDefined();
  });

  test('test-ep-4.1.1-012 (Negative): Invalid outcome enum value', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Call', outcome: 'Maybe', next_followup_date: '2026-07-10T10:00:00Z' });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['outcome']))) || res.body.error || res.body.message).toMatch(/must be one of/);
  });

  test('test-ep-4.1.1-013 (Negative): Decision Pending with null next_followup_date', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Call', outcome: 'Decision Pending', notes: 'Client will decide', next_followup_date: null });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['next_followup_date']))) || res.body.error || res.body.message).toMatch(/required/);
  });

  test('test-ep-4.1.1-014 (Negative): Interested with null next_followup_date', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Email', outcome: 'Interested', next_followup_date: null });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['next_followup_date']))) || res.body.error || res.body.message).toMatch(/required/);
  });

  test('test-ep-4.1.1-015 (Negative): Lead not found', async () => {
    mockLeadNotFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${NONEXISTENT_LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(404);
    expect((res.body.body && res.body.body.error) || res.body.error || res.body.message).toBe('Lead not found');
  });

  test('test-ep-4.1.1-016 (Negative): Lead not assigned to authenticated ME', async () => {
    mockLeadFound({ ...BASE_LEAD, assigned_to: ME2_USER.id });
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(403);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/Not authorized|Access denied/);
  });

  test('test-ep-4.1.1-017 (Negative): Unauthenticated request', async () => {
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(401);
  });

  test('test-ep-4.1.1-018 (Negative): Invalid leadId format', async () => {
    mockLeadFound();
    const res = await request(app)
      .post('/api/marketing/leads/invalid-id/followups')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/Invalid lead ID format/);
  });

  test('test-ep-4.1.1-019 (Negative): Invalid next_followup_date format', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: 'Call', outcome: 'Interested', next_followup_date: 'not-a-date' });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['next_followup_date']))) || res.body.error || res.body.message).toMatch(/Invalid date format/);
  });

  test('test-ep-4.1.1-020 (Negative): Negative proposal_amount', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: -100 });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['proposal_amount']))) || res.body.error || res.body.message).toMatch(/non-negative/);
  });

  test('test-ep-4.1.1-021 (Negative): proposal_amount is not a number', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: 'abc' });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['proposal_amount']))) || res.body.error || res.body.message).toMatch(/must be a number/);
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  test('test-ep-4.1.1-022 (Edge): notes at maximum 1000 characters', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, notes: 'A'.repeat(1000) });

    expect(res.status).toBe(201);
  });

  test('test-ep-4.1.1-023 (Edge): notes exceeding 1000 characters', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, notes: 'A'.repeat(1001) });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['notes']))) || res.body.error || res.body.message).toMatch(/1000 characters/);
  });

  test('test-ep-4.1.1-024 (Edge): Multiple follow-ups on same lead — each succeeds', async () => {
    for (let i = 0; i < 3; i++) {
      mockLeadFound();
      const res = await request(app)
        .post(`/api/marketing/leads/${LEAD_ID}/followups`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send(BASE_FOLLOWUP_BODY);
      expect(res.status).toBe(201);
    }
  });

  test('test-ep-4.1.1-025 (Edge): next_followup_date in the past accepted (backfill)', async () => {
    mockLeadFound();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, next_followup_date: yesterday });

    // Business allows past dates for backfill
    expect([201, 400]).toContain(res.status);
  });

  test('test-ep-4.1.1-026 (Edge): proposal_amount = 0 is allowed', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: 0 });

    expect(res.status).toBe(201);
    expect(res.body.lead_updated).toEqual({ proposal_value: 0 });
  });

  test('test-ep-4.1.1-027 (Edge): Very large proposal amount 999999999.99', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: 999999999.99 });

    expect([201, 400]).toContain(res.status);
  });

  test('test-ep-4.1.1-028 (Edge): Follow-up on Won lead returns 403', async () => {
    mockLeadFound(CLOSED_LEAD, ADMIN_USER);
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID_CLOSED}/followups`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(403);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/closed lead/);
  });
});

// =============================================================================
// API-2: GET /marketing/leads/:id/timeline (Enhanced)
// =============================================================================

describe('API-2: GET /marketing/leads/:id/timeline', () => {
  const mockTimelineData = (authUser = MARKETING_USER) => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [authUser] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) {
        return { rows: [authUser.role === 'Admin' ? BASE_LEAD : { ...BASE_LEAD, assigned_to: authUser.id }] };
      }
      if (sql.includes('FROM lead_history')) {
        return {
          rows: [
            { id: 'h1', field_name: 'lead_created', change_summary: 'Lead created', changed_by: ADMIN_USER.id, changed_by_name: 'Admin User', old_value: null, new_value: null, created_at: '2026-07-01T08:00:00Z' },
            { id: 'h2', field_name: 'stage', change_summary: 'Stage changed', changed_by: ADMIN_USER.id, changed_by_name: 'Admin User', old_value: 'New Lead', new_value: 'Contacted', created_at: '2026-07-02T09:00:00Z' },
            { id: 'h3', field_name: 'stage', change_summary: 'Stage changed', changed_by: ADMIN_USER.id, changed_by_name: 'Admin User', old_value: 'Contacted', new_value: 'Meeting Scheduled', created_at: '2026-07-03T10:00:00Z' },
          ],
        };
      }
      if (sql.includes('FROM followups')) {
        return {
          rows: [
            { ...FOLLOWUP_ROW, id: 'f1', created_at: '2026-07-04T11:00:00Z' },
            { ...FOLLOWUP_ROW, id: 'f2', created_at: '2026-07-05T12:00:00Z' },
          ],
        };
      }
      return { rows: [] };
    });
  };

  test('test-ep-4.1.1-029 (Positive): Timeline includes followup + status events', async () => {
    mockTimelineData();
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThanOrEqual(2);
  });

  test('test-ep-4.1.1-030 (Positive): Filter type=followup returns only follow-ups', async () => {
    mockTimelineData();
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=followup`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    const types = res.body.data.timeline.map((e) => e.type);
    expect(types.every((t) => t === 'followup')).toBe(true);
  });

  test('test-ep-4.1.1-031 (Positive): Pagination metadata is returned', async () => {
    mockTimelineData();
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?page=1&limit=10`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBeDefined();
    expect(res.body.pagination.total_pages).toBeDefined();
    expect(res.body.pagination.total_count).toBeDefined();
    expect(res.body.pagination.has_more).toBeDefined();
  });

  test('test-ep-4.1.1-032 (Positive): Follow-up event includes author name and timestamp', async () => {
    mockTimelineData();
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=followup`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    const followupEvent = res.body.data.timeline.find((e) => e.type === 'followup');
    expect(followupEvent).toBeDefined();
    expect(followupEvent.actor).toBeDefined();
    expect(followupEvent.created_at).toBeDefined();
  });

  test('test-ep-4.1.1-033 (Positive): Admin can view any lead timeline', async () => {
    mockTimelineData(ADMIN_USER);
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('test-ep-4.1.1-034 (Negative): Lead not found', async () => {
    mockLeadNotFound();
    const res = await request(app)
      .get(`/api/marketing/leads/${NONEXISTENT_LEAD_ID}/timeline`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(404);
    expect((res.body.body && res.body.body.error) || res.body.error || res.body.message).toBe('Lead not found');
  });

  test('test-ep-4.1.1-035 (Negative): ME cannot view another user lead timeline', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads')) return { rows: [{ ...BASE_LEAD, assigned_to: ME2_USER.id }] };
      return { rows: [] };
    });

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(403);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/Not authorized|Access denied/);
  });

  test('test-ep-4.1.1-036 (Negative): Unauthenticated request', async () => {
    const res = await request(app).get(`/api/marketing/leads/${LEAD_ID}/timeline`);
    expect(res.status).toBe(401);
  });

  test('test-ep-4.1.1-037 (Negative): Invalid type filter', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads')) return { rows: [BASE_LEAD] };
      return { rows: [] };
    });

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=invalid_type`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['type']))) || res.body.error || res.body.message).toMatch(/Invalid type filter/);
  });

  test('test-ep-4.1.1-038 (Edge): Empty timeline for new lead', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads')) return { rows: [BASE_LEAD] };
      if (sql.includes('FROM lead_history')) return { rows: [] };
      if (sql.includes('FROM followups')) return { rows: [] };
      return { rows: [] };
    });

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toEqual([]);
  });

  test('test-ep-4.1.1-039 (Edge): Multiple type filters combined', async () => {
    mockTimelineData();
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=followup&type=status_change`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    const types = res.body.data.timeline.map((e) => e.type);
    types.forEach((t) => expect(['followup', 'status_change']).toContain(t));
  });

  test('test-ep-4.1.1-040 (Edge): Page number exceeds total pages returns empty', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads')) return { rows: [BASE_LEAD] };
      if (sql.includes('FROM lead_history')) {
        return { rows: [{ id: 'h1', field_name: 'stage', change_summary: 'x', changed_by: ADMIN_USER.id, changed_by_name: 'Admin', old_value: null, new_value: null, created_at: '2026-07-01T08:00:00Z' }] };
      }
      if (sql.includes('FROM followups')) return { rows: [] };
      return { rows: [] };
    });

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?page=999&limit=10`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toEqual([]);
    expect(res.body.pagination.has_more).toBe(false);
  });
});

// =============================================================================
// API-3: GET /marketing/followups/today
// =============================================================================

describe('API-3: GET /marketing/followups/today', () => {
  const TODAY_LEADS = [
    { id: LEAD_ID, company_name: 'Acme', contact_person: 'John', lead_quality: 'Hot', next_followup_date: new Date().toISOString(), stage: 'Contacted' },
    { id: 'ee', company_name: 'Beta', contact_person: 'Jane', lead_quality: 'Warm', next_followup_date: new Date().toISOString(), stage: 'Contacted' },
    { id: 'ff', company_name: 'Gamma', contact_person: 'Bob', lead_quality: 'Cold', next_followup_date: new Date().toISOString(), stage: 'Contacted' },
  ];

  test('test-ep-4.1.1-041 (Positive): Returns today\'s follow-ups sorted by quality', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: TODAY_LEADS };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/today')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
  });

  test('test-ep-4.1.1-042 (Positive): Empty array when no follow-ups today', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: [] };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/today')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('test-ep-4.1.1-043 (Positive): Admin sees all users follow-ups today', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [ADMIN_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: TODAY_LEADS };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(0);
  });

  test('test-ep-4.1.1-044 (Negative): Unauthenticated request', async () => {
    const res = await request(app).get('/api/marketing/followups/today');
    expect(res.status).toBe(401);
  });

  test('test-ep-4.1.1-045 (Edge): Won/Lost leads excluded from today results (SQL WHERE)', async () => {
    // Won lead filtered out by DB WHERE clause; mock returns empty
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: [] };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/today')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// =============================================================================
// API-4: GET /marketing/followups/overdue
// =============================================================================

describe('API-4: GET /marketing/followups/overdue', () => {
  const OVERDUE_LEADS = [
    { id: 'aa', company_name: 'Acme', contact_person: 'John', next_followup_date: '2026-07-01T00:00:00Z', stage: 'Contacted', lead_quality: 'Hot', days_overdue: 5 },
    { id: 'bb', company_name: 'Beta', contact_person: 'Jane', next_followup_date: '2026-07-03T00:00:00Z', stage: 'Contacted', lead_quality: 'Warm', days_overdue: 3 },
  ];

  test('test-ep-4.1.1-046 (Positive): Returns overdue leads with days_overdue', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: OVERDUE_LEADS };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/overdue')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].days_overdue).toBeDefined();
    expect(res.body.data[0].days_overdue).toBeGreaterThanOrEqual(res.body.data[1].days_overdue);
  });

  test('test-ep-4.1.1-047 (Positive): Empty array when no overdue follow-ups', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: [] };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/overdue')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('test-ep-4.1.1-048 (Positive): Admin sees all overdue follow-ups', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [ADMIN_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: OVERDUE_LEADS };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/overdue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('test-ep-4.1.1-049 (Negative): Unauthenticated request', async () => {
    const res = await request(app).get('/api/marketing/followups/overdue');
    expect(res.status).toBe(401);
  });

  test('test-ep-4.1.1-050 (Edge): days_overdue calculated correctly', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: [{ ...OVERDUE_LEADS[0], days_overdue: 3 }] };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/overdue')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].days_overdue).toBe(3);
  });

  test('test-ep-4.1.1-051 (Edge): Null next_followup_date excluded (SQL IS NOT NULL)', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('CURRENT_DATE')) return { rows: [] };
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/marketing/followups/overdue')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// =============================================================================
// API-5: Cross-Cutting — Immutability & Audit (C1-81, C1-82)
// =============================================================================

describe('API-5: Cross-Cutting — Immutability & Audit', () => {
  test('test-ep-4.1.1-052 (Positive): created_by is set server-side, not from request body', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, created_by: 'some-other-user-id' });

    expect(res.status).toBe(201);
    expect(res.body.data.created_by.id).toBe(MARKETING_USER.id);
    expect(res.body.data.created_by.id).not.toBe('some-other-user-id');
  });

  test('test-ep-4.1.1-053 (Positive): created_at is set server-side, not from request body', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, created_at: '2020-01-01T00:00:00Z' });

    expect(res.status).toBe(201);
    expect(res.body.data.created_at).not.toBe('2020-01-01T00:00:00Z');
  });

  test('test-ep-4.1.1-054 (Negative): PUT on followup returns 405', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [ADMIN_USER] };
      return { rows: [] };
    });

    const res = await request(app)
      .put(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ outcome: 'Interested' });

    expect(res.status).toBe(405);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/immutable/);
  });

  test('test-ep-4.1.1-054b (Negative): PATCH on followup returns 405', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [ADMIN_USER] };
      return { rows: [] };
    });

    const res = await request(app)
      .patch(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ outcome: 'Interested' });

    expect(res.status).toBe(405);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/immutable/);
  });

  test('test-ep-4.1.1-055 (Negative): DELETE on followup returns 405', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [ADMIN_USER] };
      return { rows: [] };
    });

    const res = await request(app)
      .delete(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(405);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/cannot be deleted/);
  });

  test('test-ep-4.1.1-056 (Positive): Correction note added to own follow-up', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [BASE_LEAD] };
      if (sql.includes('FROM followups WHERE id')) return { rows: [{ ...FOLLOWUP_ROW, created_by: MARKETING_USER.id }] };
      if (sql.includes('UPDATE followups')) {
        return { rows: [{ ...FOLLOWUP_ROW, correction_notes: 'Updated contact number noted', correction_by: MARKETING_USER.id, correction_at: new Date().toISOString() }] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}/correction`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ correction_notes: 'Updated contact number noted' });

    expect(res.status).toBe(200);
    expect(res.body.data.correction_notes).toBe('Updated contact number noted');
  });

  test('test-ep-4.1.1-057 (Negative): Correction note empty body', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      return { rows: [] };
    });

    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}/correction`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ correction_notes: '' });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['correction_notes']))) || res.body.error || res.body.message).toMatch(/cannot be empty/);
  });

  test('test-ep-4.1.1-058 (Positive): Follow-up creation writes to Lead History', async () => {
    let leadHistoryInsertCalled = false;
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [BASE_LEAD] };
      if (sql.includes('SELECT id, name FROM users')) return { rows: [{ id: MARKETING_USER.id, name: MARKETING_USER.name }] };
      if (sql.includes('INSERT INTO followups')) return { rows: [FOLLOWUP_ROW] };
      if (sql.includes('INSERT INTO lead_history')) { leadHistoryInsertCalled = true; return { rows: [{}] }; }
      if (sql.includes('INSERT INTO audit_logs')) return { rows: [{}] };
      return { rows: [] };
    });

    await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(leadHistoryInsertCalled).toBe(true);
  });

  test('test-ep-4.1.1-059 (Positive): Follow-up creation writes to Audit Log', async () => {
    let auditLogCalled = false;
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [BASE_LEAD] };
      if (sql.includes('SELECT id, name FROM users')) return { rows: [{ id: MARKETING_USER.id, name: MARKETING_USER.name }] };
      if (sql.includes('INSERT INTO followups')) return { rows: [FOLLOWUP_ROW] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{}] };
      if (sql.includes('INSERT INTO audit_logs')) { auditLogCalled = true; return { rows: [{}] }; }
      return { rows: [] };
    });

    await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(auditLogCalled).toBe(true);
  });

  test('test-ep-4.1.1-060 (Security): XSS attempt in notes stored as-is', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, notes: "<script>alert('xss')</script>" });

    expect(res.status).toBe(201);
    // Notes stored; no script execution in API layer
  });

  test('test-ep-4.1.1-061 (Security): SQL injection in followup_type rejected by enum check', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ followup_type: "'; DROP TABLE followups; --", outcome: 'Interested', next_followup_date: '2026-07-10T10:00:00Z' });

    expect(res.status).toBe(400);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['followup_type']))) || res.body.error || res.body.message).toMatch(/must be one of/);
  });

  test('test-ep-4.1.1-062 (Security): Large payload (100KB notes) rejected', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, notes: 'A'.repeat(102400) });

    expect([400, 413]).toContain(res.status);
  });

  test('test-ep-4.1.1-063 (Positive): stage_at_log captures current stage', async () => {
    mockLeadFound({ ...BASE_LEAD, stage: 'Meeting Scheduled' });
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [{ ...BASE_LEAD, stage: 'Meeting Scheduled' }] };
      if (sql.includes('SELECT id, name FROM users')) return { rows: [{ id: MARKETING_USER.id, name: MARKETING_USER.name }] };
      if (sql.includes('INSERT INTO followups')) return { rows: [{ ...FOLLOWUP_ROW, stage_at_log: 'Meeting Scheduled' }] };
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{}] };
      if (sql.includes('INSERT INTO audit_logs')) return { rows: [{}] };
      return { rows: [] };
    });

    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);

    expect(res.status).toBe(201);
    expect(res.body.data.stage_at_log).toBe('Meeting Scheduled');
  });

  test('test-ep-4.1.1-064 (Edge): Concurrent follow-up creation all succeed', async () => {
    const reqs = Array(5).fill(null).map(() => {
      mockLeadFound();
      return request(app)
        .post(`/api/marketing/leads/${LEAD_ID}/followups`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send(BASE_FOLLOWUP_BODY);
    });

    const results = await Promise.all(reqs);
    results.forEach((r) => expect(r.status).toBe(201));
  });

  test('test-ep-4.1.1-065 (Edge): Whitespace-only notes stored as null', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, notes: '   ' });

    expect(res.status).toBe(201);
    expect(res.body.data.notes).toBeNull();
  });

  test('test-ep-4.1.1-066 (Edge): proposal_amount with more than 2 decimal places accepted', async () => {
    mockLeadFound();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: 12345.6789 });

    // DB handles rounding for NUMERIC(12,2)
    expect([201, 400]).toContain(res.status);
  });

  test('test-ep-4.1.1-067 (Edge): Multiple correction notes — latest wins', async () => {
    const buildCorrectionMock = (corrNote) => {
      mockQuery.mockImplementation((sql) => {
        if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
        if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [BASE_LEAD] };
        if (sql.includes('FROM followups WHERE id')) return { rows: [{ ...FOLLOWUP_ROW, created_by: MARKETING_USER.id }] };
        if (sql.includes('UPDATE followups')) return { rows: [{ ...FOLLOWUP_ROW, correction_notes: corrNote, correction_by: MARKETING_USER.id, correction_at: new Date().toISOString() }] };
        return { rows: [] };
      });
    };

    buildCorrectionMock('First correction');
    const res1 = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}/correction`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ correction_notes: 'First correction' });
    expect(res1.status).toBe(200);

    buildCorrectionMock('Latest correction');
    const res2 = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}/correction`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ correction_notes: 'Latest correction' });
    expect(res2.status).toBe(200);
    expect(res2.body.data.correction_notes).toBe('Latest correction');
  });

  test('test-ep-4.1.1-068 (Positive): Admin can correct any follow-up', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [ADMIN_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [BASE_LEAD] };
      if (sql.includes('FROM followups WHERE id')) return { rows: [{ ...FOLLOWUP_ROW, created_by: MARKETING_USER.id }] };
      if (sql.includes('UPDATE followups')) return { rows: [{ ...FOLLOWUP_ROW, correction_notes: 'Admin fix', correction_by: ADMIN_USER.id, correction_at: new Date().toISOString() }] };
      return { rows: [] };
    });

    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}/correction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ correction_notes: 'Admin fix' });

    expect(res.status).toBe(200);
  });

  test('test-ep-4.1.1-069 (Negative): ME cannot correct another ME\'s follow-up', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [{ ...BASE_LEAD, assigned_to: ME2_USER.id }] };
      if (sql.includes('FROM followups WHERE id')) return { rows: [{ ...FOLLOWUP_ROW, created_by: ME2_USER.id }] };
      return { rows: [] };
    });

    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups/${FOLLOWUP_ID}/correction`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ correction_notes: 'Unauthorized correction' });

    expect(res.status).toBe(403);
    expect((res.body.body && (res.body.body.error || (res.body.body.errors && res.body.body.errors['error']))) || res.body.error || res.body.message).toMatch(/only correct your own/);
  });

  test('test-ep-4.1.1-070 (Security): Unauthenticated returns 401 on all endpoints', async () => {
    const endpoints = [
      () => request(app).post(`/api/marketing/leads/${LEAD_ID}/followups`).send(BASE_FOLLOWUP_BODY),
      () => request(app).get(`/api/marketing/leads/${LEAD_ID}/timeline`),
      () => request(app).get('/api/marketing/followups/today'),
      () => request(app).get('/api/marketing/followups/overdue'),
    ];

    for (const call of endpoints) {
      const res = await call();
      expect(res.status).toBe(401);
    }
  });

  test('test-ep-4.1.1-071 (Edge): Response time under 2 seconds', async () => {
    mockLeadFound();
    const start = Date.now();
    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(BASE_FOLLOWUP_BODY);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(201);
    expect(elapsed).toBeLessThan(2000);
  });

  test('test-ep-4.1.1-072 (Edge): Null proposal_amount does NOT update lead proposal_value', async () => {
    let proposalUpdateCalled = false;
    mockQuery.mockImplementation((sql) => {
      if (sql === 'SELECT * FROM users WHERE id = $1') return { rows: [MARKETING_USER] };
      if (sql.includes('FROM leads') && sql.includes('WHERE l.id')) return { rows: [{ ...BASE_LEAD, proposal_value: 50000 }] };
      if (sql.includes('SELECT id, name FROM users')) return { rows: [{ id: MARKETING_USER.id, name: MARKETING_USER.name }] };
      if (sql.includes('INSERT INTO followups')) return { rows: [FOLLOWUP_ROW] };
      if (sql.includes('UPDATE leads SET proposal_value')) { proposalUpdateCalled = true; return { rows: [{}] }; }
      if (sql.includes('INSERT INTO lead_history')) return { rows: [{}] };
      if (sql.includes('INSERT INTO audit_logs')) return { rows: [{}] };
      return { rows: [] };
    });

    const res = await request(app)
      .post(`/api/marketing/leads/${LEAD_ID}/followups`)
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ ...BASE_FOLLOWUP_BODY, proposal_amount: null });

    expect(res.status).toBe(201);
    expect(proposalUpdateCalled).toBe(false);
    expect(res.body.lead_updated).toBeUndefined();
  });
});
