const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const {
  ADMIN_USER, MARKETING_USER,
} = require('./setup');

let mockQuery = jest.fn();
jest.mock('../config/db', () => ({ query: (...args) => mockQuery(...args) }));

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/marketing', require('../routes/marketing'));
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
const expiredToken = jwt.sign(
  { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
  process.env.JWT_SECRET, { expiresIn: '-5s' }
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

describe('STORY-2.1.4: Lead Stage Management Tests', () => {

  // ============================================================
  // API-1: PUT /marketing/leads/:id/status — Stage Transition
  // ============================================================
  describe('API-1: PUT /marketing/leads/:id/status', () => {
    const leadId = 'e4c18495-e224-5b11-b652-c9559fc9c902';
    const otherMEId = '33333333-3333-3333-3333-333333333333';

    test('test-ep-2.4.1-001 (Positive): ME transitions lead from New Lead to Contacted', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Contacted', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
        ['INSERT INTO lead_history', () => ({ rows: [{}] })],
        ['INSERT INTO audit_logs', () => ({ rows: [{}] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('Contacted');
    });

    test('test-ep-2.4.1-002 (Positive): ME transitions lead from Contacted to Meeting Scheduled', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Meeting Scheduled', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Meeting Scheduled' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Meeting Scheduled');
    });

    test('test-ep-2.4.1-003 (Positive): ME transitions lead from Meeting Scheduled to Requirement Gathering', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Meeting Scheduled', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Requirement Gathering', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Requirement Gathering' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Requirement Gathering');
    });

    test('test-ep-2.4.1-004 (Positive): ME transitions lead from Requirement Gathering to Proposal Sent', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Requirement Gathering', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Proposal Sent', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Proposal Sent' });
      expect(res.status).toBe(200);
    });

    test('test-ep-2.4.1-005 (Positive): ME transitions lead from Proposal Sent to Negotiation', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Proposal Sent', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Negotiation', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Negotiation' });
      expect(res.status).toBe(200);
    });

    test('test-ep-2.4.1-006 (Positive): ME transitions lead from New Lead to Hold', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Hold', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Hold' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Hold');
    });

    test('test-ep-2.4.1-061 (Positive): Valid forward transition from Hold to Negotiation', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Hold', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Negotiation', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Negotiation' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Negotiation');
    });

    test('test-ep-2.4.1-007 (Positive): Admin transitions stage for any lead regardless of assignment', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: otherMEId }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Contacted', lead_status: 'Active', assigned_to: otherMEId }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(200);
    });

    test('test-ep-2.4.1-008 (Negative): Illegal transition from New Lead directly to Won', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won' });
      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Invalid stage transition from 'New Lead' to 'Won'. Allowed transitions: Contacted, Hold, Lost");
    });

    test('test-ep-2.4.1-009 (Negative): Illegal transition from New Lead directly to Meeting Scheduled', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Meeting Scheduled' });
      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Invalid stage transition from 'New Lead' to 'Meeting Scheduled'. Allowed transitions: Contacted, Hold, Lost");
    });

    test('test-ep-2.4.1-010 (Negative): Illegal transition from Contacted directly to Won', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won' });
      expect(res.status).toBe(422);
      expect(res.body.error).toContain("Allowed transitions");
    });

    test('test-ep-2.4.1-011 (Negative): Backwards transition from Negotiation to New Lead', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'New Lead' });
      expect(res.status).toBe(422);
    });

    test('test-ep-2.4.1-012 (Negative): ME attempts to update stage on a Won lead', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Won', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('This lead is closed. Contact Admin to reopen.');
    });

    test('test-ep-2.4.1-013 (Negative): ME attempts to update stage on a Lost lead', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Lost', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('This lead is closed. Contact Admin to reopen.');
    });

    test('test-ep-2.4.1-014 (Negative): Missing stage field in request body', async () => {
      defaultQuery([
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.stage).toBe('Stage is required');
    });

    test('test-ep-2.4.1-015 (Negative): Invalid stage enum value', async () => {
      defaultQuery([
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'InvalidStage' });
      expect(res.status).toBe(400);
      expect(res.body.stage).toBe('Invalid stage value. Must be one of: New Lead, Contacted, Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Hold, Won, Lost');
    });

    test('test-ep-2.4.1-016 (Negative): Unauthenticated request', async () => {
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    test('test-ep-2.4.1-052 (Negative): Expired JWT token on stage transition', async () => {
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token has expired');
    });

    test('test-ep-2.4.1-060 (Negative): Malformed Authorization header value', async () => {
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer invalidtoken`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token format');
    });

    test('test-ep-2.4.1-017 (Negative): ME attempts to update a lead not assigned to them', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: otherMEId }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied. Lead not assigned to you.');
    });

    test('test-ep-2.4.1-018 (Negative): Non-existent lead ID', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/88888888-8888-8888-8888-888888888888/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Lead not found');
    });

    test('test-ep-2.4.1-051 (Negative): Non-UUID lead ID in stage transition request', async () => {
      defaultQuery([
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/abc-123/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(400);
      expect(res.body.id).toBe('Invalid lead ID format. Expected UUID.');
    });

    test('test-ep-2.4.1-019 (Edge): Transition to same stage (no-op)', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Contacted');
      expect(mockQuery).toHaveBeenCalledTimes(2); // SELECT lead + SELECT user
    });

    test('test-ep-2.4.1-053 (Edge): Two concurrent ME requests update the same lead stage simultaneously', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Contacted', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const app = createTestApp();
      const p1 = request(app)
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      const p2 = request(app)
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Hold' });

      const [r1, r2] = await Promise.all([p1, p2]);
      expect([200, 200]).toContain(r1.status);
      expect([200, 200]).toContain(r2.status);
    });

    test('test-ep-2.4.1-062 (Edge): Soft-deleted lead returns 404 for stage transition', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id, deleted_at: new Date().toISOString() }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Lead not found');
    });
  });

  // ============================================================
  // API-2: POST /marketing/leads/:id/close (Close as Lost) — Lost Reason Capture
  // ============================================================
  describe('API-2: POST /marketing/leads/:id/close', () => {
    const leadId = 'e4c18495-e224-5b11-b652-c9559fc9c902';

    test('test-ep-2.4.1-020 (Positive): Close lead as Lost with valid reason from any active stage', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Lost', lead_status: 'Closed', lost_reason: 'Budget', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('Lost');
      expect(res.body.data.lead_status || res.body.data.status).toBe('Closed');
      expect(res.body.data.lost_reason).toBe('Budget');
    });

    test('test-ep-2.4.1-021 (Positive): Close as Lost from New Lead stage with valid reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'New Lead', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Lost', lead_status: 'Closed', lost_reason: 'Competitor', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Competitor' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Lost');
    });

    test('test-ep-2.4.1-022 (Positive): Close as Lost with each valid lost_reason enum value', async () => {
      const reasons = ['Budget', 'Competitor', 'Not Interested', 'No Response', 'Timing', 'Other'];
      for (const r of reasons) {
        defaultQuery([
          ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id }] })],
          ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
          ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Lost', lead_status: 'Closed', lost_reason: r, assigned_to: MARKETING_USER.id }] })],
        ]);
        const res = await request(createTestApp())
          .post(`/api/marketing/leads/${leadId}/close`)
          .set('Authorization', `Bearer ${marketingToken}`)
          .send({ stage: 'Lost', lost_reason: r });
        expect(res.status).toBe(200);
        expect(res.body.data.lost_reason).toBe(r);
      }
    });

    test('test-ep-2.4.1-023 (Negative): Close as Lost without providing lost_reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost' });
      expect(res.status).toBe(400);
      expect(res.body.lost_reason).toBe('Lost reason is required when stage is Lost');
    });

    test('test-ep-2.4.1-024 (Negative): Close as Lost with empty lost_reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: '' });
      expect(res.status).toBe(400);
      expect(res.body.lost_reason).toBe('Lost reason cannot be empty');
    });

    test('test-ep-2.4.1-025 (Negative): Close as Lost with invalid lost_reason enum value', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'InvalidReason' });
      expect(res.status).toBe(400);
      expect(res.body.lost_reason).toBe('Invalid lost reason. Must be one of: Budget, Competitor, Not Interested, No Response, Timing, Other');
    });

    test('test-ep-2.4.1-026 (Negative): Close an already Lost lead again', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Lost', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('This lead is closed. Contact Admin to reopen.');
    });

    test('test-ep-2.4.1-027 (Negative): Unauthenticated request to close as Lost', async () => {
      const res = await request(createTestApp())
        .post(`/api/marketing/leads/${leadId}/close`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // API-3: PUT /marketing/leads/:id/close (Close as Won) — Won Values Capture
  // ============================================================
  describe('API-3: PUT /marketing/leads/:id/close', () => {
    const leadId = 'e4c18495-e224-5b11-b652-c9559fc9c902';

    test('test-ep-2.4.1-028 (Positive): Close lead as Won with valid deal value and closure date', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Won', lead_status: 'Closed', final_deal_value: 50000.00, closure_date: '2026-07-15', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 50000, closure_date: '2026-07-15' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('Won');
      expect(res.body.data.final_deal_value).toBe(50000.00);
      expect(res.body.data.closure_date).toContain('2026-07-15');
    });

    test('test-ep-2.4.1-029 (Positive): Close as Won with zero deal value (free engagement)', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Won', lead_status: 'Closed', final_deal_value: 0.00, closure_date: '2026-07-15', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 0, closure_date: '2026-07-15' });
      expect(res.status).toBe(200);
      expect(res.body.data.final_deal_value).toBe(0.00);
    });

    test('test-ep-2.4.1-055 (Positive): Close as Won with decimal deal value', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Won', lead_status: 'Closed', final_deal_value: 1234.56, closure_date: '2026-07-15', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 1234.56, closure_date: '2026-07-15' });
      expect(res.status).toBe(200);
      expect(res.body.data.final_deal_value).toBe(1234.56);
    });

    test('test-ep-2.4.1-030 (Negative): Close as Won without final_deal_value', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', closure_date: '2026-07-15' });
      expect(res.status).toBe(400);
      expect(res.body.final_deal_value).toBe('Final deal value is required when stage is Won');
    });

    test('test-ep-2.4.1-031 (Negative): Close as Won without closure_date', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 50000 });
      expect(res.status).toBe(400);
      expect(res.body.closure_date).toBe('Closure date is required when stage is Won');
    });

    test('test-ep-2.4.1-032 (Negative): Close as Won with negative deal value', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: -1000, closure_date: '2026-07-15' });
      expect(res.status).toBe(400);
      expect(res.body.final_deal_value).toBe('Final deal value must be a non-negative number');
    });

    test('test-ep-2.4.1-033 (Negative): Close as Won with future closure date beyond reasonable range', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 50000, closure_date: '2099-01-01' });
      expect(res.status).toBe(400);
      expect(res.body.closure_date).toBe('Closure date cannot be in the future');
    });

    test('test-ep-2.4.1-034 (Negative): Close as Won with invalid date format', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 50000, closure_date: 'not-a-date' });
      expect(res.status).toBe(400);
      expect(res.body.closure_date).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    test('test-ep-2.4.1-054 (Negative): Close as Won with closure date before lead creation date', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Negotiation', assigned_to: MARKETING_USER.id, created_at: '2026-06-01T00:00:00.000Z' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 50000, closure_date: '2025-01-01' });
      expect(res.status).toBe(400);
      expect(res.body.closure_date).toBe('Closure date cannot be before lead creation date');
    });

    test('test-ep-2.4.1-035 (Negative): Close as Won from stage that is not Negotiation (blocked)', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 50000, closure_date: '2026-07-15' });
      expect(res.status).toBe(422);
      expect(res.body.error).toBe("Cannot close as Won from stage 'Contacted'. Lead must be in 'Negotiation' stage.");
    });

    test('test-ep-2.4.1-036 (Negative): Unauthenticated request to close as Won', async () => {
      const res = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/close`)
        .send({ stage: 'Won', final_deal_value: 50000, closure_date: '2026-07-15' });
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // API-4: POST /admin/leads/:id/reopen — Admin Reopen Override
  // ============================================================
  describe('API-4: POST /admin/leads/:id/reopen', () => {
    const leadId = 'e4c18495-e224-5b11-b652-c9559fc9c902';

    test('test-ep-2.4.1-037 (Positive): Admin reopens a Won lead with valid reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Won', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Contacted', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
        ['INSERT INTO lead_history', () => ({ rows: [{}] })],
        ['INSERT INTO audit_logs', () => ({ rows: [{}] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Client requested re-engagement' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stage).toBe('Contacted');
      expect(res.body.data.lead_status || res.body.data.status).toBe('Active');
    });

    test('test-ep-2.4.1-038 (Positive): Admin reopens a Lost lead with valid reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Lost', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Contacted', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'New opportunity identified' });
      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('Contacted');
    });

    test('test-ep-2.4.1-039 (Positive): Admin reopens a closed lead and ME can now update stage', async () => {
      // 1. Reopen
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Won', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Contacted', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const app = createTestApp();
      const res1 = await request(app)
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Client requested re-engagement' });
      expect(res1.status).toBe(200);

      // 2. ME transition
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['UPDATE leads', () => ({ rows: [{ id: leadId, stage: 'Meeting Scheduled', lead_status: 'Active', assigned_to: MARKETING_USER.id }] })],
      ]);
      const res2 = await request(app)
        .put(`/api/marketing/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Meeting Scheduled' });
      expect(res2.status).toBe(200);
    });

    test('test-ep-2.4.1-040 (Negative): Marketing Executive attempts to reopen a closed lead', async () => {
      defaultQuery([
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ reason: 'Client requested re-engagement' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden. Admin access required.');
    });

    test('test-ep-2.4.1-041 (Negative): Admin attempts to reopen without providing a reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Won', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.reason).toBe('Reopen reason is required');
    });

    test('test-ep-2.4.1-042 (Negative): Admin attempts to reopen with empty reason', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Won', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '' });
      expect(res.status).toBe(400);
      expect(res.body.reason).toBe('Reopen reason cannot be empty');
    });

    test('test-ep-2.4.1-059 (Negative): Admin reopen reason exceeds maximum length', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Won', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ]);
      const longReason = 'A'.repeat(501);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: longReason });
      expect(res.status).toBe(400);
      expect(res.body.reason).toBe('Reopen reason must not exceed 500 characters');
    });

    test('test-ep-2.4.1-043 (Negative): Admin attempts to reopen a lead that is not closed (already active)', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Lead is not closed. Current stage: Contacted');
    });

    test('test-ep-2.4.1-058 (Negative): Duplicate reopen request on an already-active lead', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, stage: 'Contacted', assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
      ]);
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Valid reason' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Lead is not closed. Current stage: Contacted');
    });

    test('test-ep-2.4.1-044 (Negative): Unauthenticated request to reopen', async () => {
      const res = await request(createTestApp())
        .post(`/api/admin/leads/${leadId}/reopen`)
        .send({ reason: 'Test' });
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // API-5: GET /marketing/leads/:id/lead-history & GET /admin/leads/:id/lead-history — Lead History Read
  // ============================================================
  describe('API-5: GET /marketing/leads/:id/lead-history & GET /admin/leads/:id/lead-history', () => {
    const leadId = 'e4c18495-e224-5b11-b652-c9559fc9c902';
    const otherMEId = '33333333-3333-3333-3333-333333333333';

    test('test-ep-2.4.1-045 (Positive): ME retrieves lead history for their assigned lead', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['COUNT(*)', () => ({ rows: [{ count: '3' }] })],
        ['SELECT h.*', () => ({
          rows: [
            { id: '1', lead_id: leadId, field_name: 'stage', old_value: 'Proposal Sent', new_value: 'Negotiation', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', actor_name: 'Marketing User', created_at: '2026-07-02T10:00:00.000Z' },
            { id: '2', lead_id: leadId, field_name: 'stage', old_value: 'Meeting Scheduled', new_value: 'Proposal Sent', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', actor_name: 'Marketing User', created_at: '2026-07-02T09:00:00.000Z' },
            { id: '3', lead_id: leadId, field_name: 'stage', old_value: 'New Lead', new_value: 'Contacted', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', actor_name: 'Marketing User', created_at: '2026-07-02T08:00:00.000Z' },
          ],
        })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/marketing/leads/${leadId}/lead-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].event_type).toBe('Stage Changed');
      expect(res.body.data[0].actor).toBe('EMP-00002');
    });

    test('test-ep-2.4.1-046 (Positive): Admin retrieves lead history for any lead', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: otherMEId }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['COUNT(*)', () => ({ rows: [{ count: '1' }] })],
        ['SELECT h.*', () => ({
          rows: [
            { id: '1', lead_id: leadId, field_name: 'stage', old_value: 'Proposal Sent', new_value: 'Negotiation', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', actor_name: 'Marketing User', created_at: '2026-07-02T10:00:00.000Z' },
          ],
        })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/admin/leads/${leadId}/lead-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].event_type).toBe('Stage Changed');
    });

    test('test-ep-2.4.1-047 (Positive): Lead history includes stage changed, close, and reopen events', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: otherMEId }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [ADMIN_USER] })],
        ['COUNT(*)', () => ({ rows: [{ count: '6' }] })],
        ['SELECT h.*', () => ({
          rows: [
            { id: '6', lead_id: leadId, field_name: 'stage', old_value: 'Negotiation', new_value: 'Won', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', created_at: '2026-07-02T15:00:00.000Z' },
            { id: '5', lead_id: leadId, field_name: 'stage', old_value: 'Contacted', new_value: 'Negotiation', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', created_at: '2026-07-02T14:00:00.000Z' },
            { id: '4', lead_id: leadId, field_name: 'Lead Reopened', old_value: 'Lost', new_value: 'Contacted', changed_by: ADMIN_USER.id, actor_employee_id: 'EMP-00001', created_at: '2026-07-02T13:00:00.000Z' },
            { id: '3', lead_id: leadId, field_name: 'stage', old_value: 'Contacted', new_value: 'Lost', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', created_at: '2026-07-02T12:00:00.000Z' },
            { id: '2', lead_id: leadId, field_name: 'stage', old_value: 'New Lead', new_value: 'Contacted', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', created_at: '2026-07-02T11:00:00.000Z' },
            { id: '1', lead_id: leadId, field_name: 'stage', old_value: null, new_value: 'New Lead', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', created_at: '2026-07-02T10:00:00.000Z' },
          ],
        })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/admin/leads/${leadId}/lead-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(6);
      expect(res.body.data[2].event_type).toBe('Lead Reopened');
    });

    test('test-ep-2.4.1-056 (Positive): Lead history returns paginated response with metadata', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['COUNT(*)', () => ({ rows: [{ count: '55' }] })],
        ['SELECT h.*', () => ({
          rows: Array(20).fill({
            id: 'x', lead_id: leadId, field_name: 'stage', old_value: 'New Lead', new_value: 'Contacted', changed_by: MARKETING_USER.id, actor_employee_id: 'EMP-00002', created_at: '2026-07-02T10:00:00.000Z',
          }),
        })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/marketing/leads/${leadId}/lead-history?page=1&limit=20`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(3);
      expect(res.body.totalEntries).toBe(55);
      expect(res.body.hasMore).toBe(true);
      expect(res.body.data.length).toBe(20);
    });

    test('test-ep-2.4.1-057 (Negative): Lead history with invalid page parameter', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/marketing/leads/${leadId}/lead-history?page=-1&limit=20`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(400);
      expect(res.body.page).toBe('Page must be a positive integer');
    });

    test('test-ep-2.4.1-048 (Negative): ME cannot retrieve history for a lead not assigned to them', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: otherMEId }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/marketing/leads/${leadId}/lead-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied. Lead not assigned to you.');
    });

    test('test-ep-2.4.1-049 (Negative): History immutability — no update/delete endpoint exists', async () => {
      const res1 = await request(createTestApp())
        .put(`/api/marketing/leads/${leadId}/lead-history/someEntryId`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect([404, 405]).toContain(res1.status);

      const res2 = await request(createTestApp())
        .delete(`/api/marketing/leads/${leadId}/lead-history/someEntryId`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect([404, 405]).toContain(res2.status);
    });

    test('test-ep-2.4.1-050 (Edge): Lead history returns empty array for lead with no stage changes', async () => {
      defaultQuery([
        ['SELECT l.*', () => ({ rows: [{ id: leadId, assigned_to: MARKETING_USER.id }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [MARKETING_USER] })],
        ['COUNT(*)', () => ({ rows: [{ count: '0' }] })],
        ['SELECT h.*', () => ({ rows: [] })],
      ]);
      const res = await request(createTestApp())
        .get(`/api/marketing/leads/${leadId}/lead-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });
});
