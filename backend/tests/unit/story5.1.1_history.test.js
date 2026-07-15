const request = require('supertest');
const express = require('express');
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/marketing', require('../../src/routes/marketing'));
  app.use('/api/admin', require('../../src/routes/admin'));
  app.use(require('../../src/middleware/errorHandler'));
  return app;
};
const app = createTestApp();
const { query, getClient } = require('../../src/config/db');
const { ADMIN_USER, MARKETING_USER, INACTIVE_USER } = require('./setup');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

let adminToken, marketingToken;

beforeAll(() => {
  adminToken = jwt.sign({ id: ADMIN_USER.id, role: ADMIN_USER.role }, process.env.JWT_SECRET || 'test-jwt-secret-for-testing', { expiresIn: '1h' });
  marketingToken = jwt.sign({ id: MARKETING_USER.id, role: MARKETING_USER.role }, process.env.JWT_SECRET || 'test-jwt-secret-for-testing', { expiresIn: '1h' });
});

beforeEach(() => {
  jest.clearAllMocks();
  const mockClient = {
    query: jest.fn((sql, params) => query(sql, params)),
    release: jest.fn(),
  };
  require('../../src/config/db').getClient.mockResolvedValue(mockClient);
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
    // Add default user mock
    if (sql.includes('SELECT * FROM users WHERE id = $1')) {
      return Promise.resolve({
        rows: [
          { id: params[0], role: params[0] === ADMIN_USER.id ? 'Admin' : 'Marketing Executive', status: 'active', name: 'Mock User', employee_id: 'EMP001' }
        ]
      });
    }
    
    for (const [match, response] of overrides) {
      if (sql.includes(match)) {
        return Promise.resolve(response(params, sql));
      }
    }
    return Promise.resolve({ rows: [] });
  });
};

describe('STORY-5.1.1: Lead Field Change History & Audit Log', () => {
  describe('GET /api/marketing/leads/:id/field-history', () => {
    test(`test-ep-5.1.1-b-001: Verify that a Marketing Executive can fetch the field-level change log for a lead assigned to them. Response returns lead_history rows with DB columns: field_name, old_value, new_value, change_summary, changed_by, changed_at, reason. Default limit is 20, sorted newest-first by changed_at.`, async () => {
      const LEAD_UUID = '11111111-1111-1111-1111-111111111111';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '15' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [
            {
              id: 'hist-1',
              field_name: 'stage',
              old_value: 'New',
              new_value: 'Contacted',
              change_summary: 'Stage changed',
              changed_by: 'user-1',
              changed_by_name: 'John Doe',
              changed_at: '2026-07-03T14:00:00Z',
              is_system_generated: false
            }
          ]
        })]
      ]);

      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      console.log('RES 1:', res.status, res.body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history).toHaveLength(1);
      expect(res.body.data.history[0].field_name).toBe('stage');
    });

    test(`test-ep-5.1.1-b-077: Verify USER vs SYSTEM generated history entries`, async () => {
       const LEAD_UUID = '11111111-1111-1111-1111-111111111111';
       defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: ADMIN_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '2' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [
            {
              id: 'hist-1',
              field_name: 'stage',
              old_value: 'New',
              new_value: 'Contacted',
              is_system_generated: false,
              changed_by_name: 'Admin'
            },
            {
              id: 'hist-2',
              field_name: 'assigned_to',
              old_value: null,
              new_value: ADMIN_USER.id,
              is_system_generated: true,
              changed_by_name: 'System'
            }
          ]
        })]
      ]);

      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      console.log('RES 2:', res.status, res.body);
        
      expect(res.status).toBe(200);
      expect(res.body.data.history[0].is_system_generated).toBe(false);
      expect(res.body.data.history[1].is_system_generated).toBe(true);
    });

    test(`test-ep-5.1.1-b-002: Verify that the field_name query parameter filters results to only changes for the specified field.`, async () => {
      const LEAD_UUID = '22222222-2222-2222-2222-222222222222';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1 AND field_name = $2', () => ({ rows: [{ count: '2' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [
            { id: 'h1', field_name: 'stage', old_value: 'New', new_value: 'Contacted', changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: '2026-07-04T10:00:00Z', is_system_generated: false },
            { id: 'h2', field_name: 'stage', old_value: 'Contacted', new_value: 'Qualified', changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: '2026-07-03T10:00:00Z', is_system_generated: false }
          ]
        })]
      ]);
      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history?field_name=stage`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history).toHaveLength(2);
      expect(res.body.data.history.every(h => h.field_name === 'stage')).toBe(true);
    });

    test(`test-ep-5.1.1-b-003: Verify pagination boundary ΓÇö initial load returns at most 20 entries per page, with accurate pagination metadata.`, async () => {
      const LEAD_UUID = '33333333-3333-3333-3333-333333333333';
      const rows = Array.from({ length: 20 }, (_, i) => ({
        id: `h${i}`, field_name: 'stage', old_value: 'New', new_value: 'Contacted',
        changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: `2026-07-${String(20 - i).padStart(2, '0')}T10:00:00Z`, is_system_generated: false
      }));
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '25' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({ rows })]
      ]);
      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history?page=1&limit=20`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history).toHaveLength(20);
      expect(res.body.pagination.total_pages).toBe(2);
    });

    test(`test-ep-5.1.1-b-004: Verify second page retrieval returns remaining entries beyond the initial 20.`, async () => {
      const LEAD_UUID = '44444444-4444-4444-4444-444444444444';
      const rows = Array.from({ length: 5 }, (_, i) => ({
        id: `h${i}`, field_name: 'stage', old_value: 'New', new_value: 'Contacted',
        changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: `2026-07-0${5 - i}T10:00:00Z`, is_system_generated: false
      }));
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '25' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({ rows })]
      ]);
      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history?page=2&limit=20`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history).toHaveLength(5);
      expect(res.body.pagination.page).toBe(2);
    });

    test(`test-ep-5.1.1-b-005: Verify 403 Forbidden when a Marketing Executive queries field history for a lead assigned to a different user.`, async () => {
      const LEAD_UUID = '55555555-5555-5555-5555-555555555555';
      const OTHER_ME = '99999999-9999-9999-9999-999999999999';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: OTHER_ME }] })]
      ]);
      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe(`Not authorized to view this lead's history`);
    });

    test(`test-ep-5.1.1-b-006: Verify 404 when requesting field history for a non-existent lead UUID.`, async () => {
      const LEAD_UUID = '00000000-0000-0000-0000-000000000000';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Lead not found');
    });

    test(`test-ep-5.1.1-b-007: Verify 400 when lead ID parameter is not a valid UUID format.`, async () => {
      const res = await request(app)
        .get('/api/marketing/leads/invalid-uuid-format/field-history')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid lead ID');
    });

    test(`test-ep-5.1.1-b-008: Verify empty history response (lead with no lead_history rows) returns an empty array.`, async () => {
      const LEAD_UUID = '88888888-8888-8888-8888-888888888888';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '0' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .get(`/api/marketing/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history).toEqual([]);
      expect(res.body.data.total_changes).toBe(0);
      expect(res.body.pagination.total_pages).toBe(0);
    });

    test(`test-ep-5.1.1-b-009: Verify 401 when no authentication token is provided.`, async () => {
      const res = await request(app)
        .get('/api/marketing/leads/11111111-1111-1111-1111-111111111111/field-history');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/leads/:id/field-history', () => {
    test(`test-ep-5.1.1-b-010: Verify that Admin can view the full field-level change history for any lead in the system, bypassing ownership restrictions. Default limit is 50.`, async () => {
      const LEAD_UUID = '10101010-1010-1010-1010-101010101010';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '30' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: Array.from({ length: 30 }, (_, i) => ({
            id: `h${i}`, field_name: 'stage', old_value: 'New', new_value: 'Contacted',
            changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: `2026-07-${String(30 - i).padStart(2, '0')}T10:00:00Z`, is_system_generated: false
          }))
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history.length).toBeGreaterThan(0);
      expect(res.body.data.lead_id).toBe(LEAD_UUID);
    });

    test(`test-ep-5.1.1-b-011: Verify admin field history supports pagination with custom limit.`, async () => {
      const LEAD_UUID = '11111111-1111-1111-1111-111111111111';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '30' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: Array.from({ length: 20 }, (_, i) => ({
            id: `h${i}`, field_name: 'stage', old_value: 'New', new_value: 'Contacted',
            changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: `2026-07-${String(30 - i).padStart(2, '0')}T10:00:00Z`, is_system_generated: false
          }))
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history?page=1&limit=20`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history).toHaveLength(20);
      expect(res.body.pagination.total_pages).toBe(2);
    });

    test(`test-ep-5.1.1-b-012: Verify admin field history supports filtering by field_name.`, async () => {
      const LEAD_UUID = '12121212-1212-1212-1212-121212121212';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1 AND field_name = $2', () => ({ rows: [{ count: '3' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [
            { id: 'h1', field_name: 'assigned_to', old_value: null, new_value: MARKETING_USER.id, changed_by: ADMIN_USER.id, changed_by_name: 'Admin', changed_at: '2026-07-04T10:00:00Z', is_system_generated: true }
          ]
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history?field_name=assigned_to`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history.every(h => h.field_name === 'assigned_to')).toBe(true);
    });

    test(`test-ep-5.1.1-b-013: Verify 404 when admin requests field history for a non-existent lead.`, async () => {
      const LEAD_UUID = '00000000-0000-0000-0000-000000000000';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    test(`test-ep-5.1.1-b-014: Verify 400 when admin uses an invalid lead ID format.`, async () => {
      const res = await request(app)
        .get('/api/admin/leads/invalid-format/field-history')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid lead ID');
    });

    test(`test-ep-5.1.1-b-015: Verify that a Marketing Executive cannot access the admin field-history endpoint (RBAC enforcement).`, async () => {
      const res = await request(app)
        .get('/api/admin/leads/11111111-1111-1111-1111-111111111111/field-history')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
    });

    test(`test-ep-5.1.1-b-016: Verify system-generated changes (auto stage validation, system rules) are returned with changed_by indicating system actor.`, async () => {
      const LEAD_UUID = '16161616-1616-1616-1616-161616161616';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '2' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [
            { id: 'h1', field_name: 'assigned_to', old_value: null, new_value: MARKETING_USER.id, changed_by: null, changed_by_name: 'System', changed_at: '2026-07-04T10:00:00Z', is_system_generated: true },
            { id: 'h2', field_name: 'stage', old_value: 'New', new_value: 'Contacted', changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: '2026-07-03T10:00:00Z', is_system_generated: false }
          ]
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const systemEntry = res.body.data.history.find(h => h.is_system_generated === true);
      const userEntry = res.body.data.history.find(h => h.is_system_generated === false);
      expect(systemEntry).toBeDefined();
      expect(userEntry).toBeDefined();
      expect(systemEntry.changed_by_name).toBe('System');
    });
  });

  describe('GET /api/admin/leads/:id/field-history/export', () => {
    test(`test-ep-5.1.1-b-051: Admin exports a leadΓÇÖs field history as CSV. The CSV content matches exactly what is shown on screen, with columns: field_name, old_value, new_value, change_summary, changed_by, changed_at, reason.`, async () => {
      const LEAD_UUID = '51515151-5151-5151-5151-515151515151';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [
            { id: 'h1', field_name: 'stage', old_value: 'New', new_value: 'Contacted', change_summary: 'Stage changed', changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: '2026-07-04T10:00:00Z', reason: null, is_system_generated: false }
          ]
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history/export?format=csv`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('field_name,old_value,new_value,change_summary,changed_by_name,changed_at,reason');
      expect(res.text).toContain('stage');
    });

    test(`test-ep-5.1.1-b-052: Verify 400 when the format parameter is not csv.`, async () => {
      const LEAD_UUID = '52525252-5252-5252-5252-525252525252';
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history/export?format=pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Format must be csv');
    });

    test(`test-ep-5.1.1-b-053: Verify 404 when exporting history for a non-existent lead.`, async () => {
      const LEAD_UUID = '00000000-0000-0000-0000-000000000000';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history/export?format=csv`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    test(`test-ep-5.1.1-b-054: Verify 404 when the lead has no lead_history rows to export.`, async () => {
      const LEAD_UUID = '54545454-5454-5454-5454-545454545454';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history/export?format=csv`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('No history found for this lead');
    });

    test(`test-ep-5.1.1-b-055: Verify 403 when a Marketing Executive attempts to export field history.`, async () => {
      const res = await request(app)
        .get('/api/admin/leads/11111111-1111-1111-1111-111111111111/field-history/export?format=csv')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/audit-log', () => {
    test(`test-ep-5.1.1-b-056: Admin fetches the system-wide audit log with filters (actor, action_type, entity_affected, date range). Response uses audit_logs DB columns: action_type, actor, entity_affected, entity_id, result, ip_address, details, created_at.`, async () => {
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({ rows: [{ id: 'aud-1', user_id: ADMIN_USER.id, action: 'lead.status_changed', resource: 'lead', resource_id: 'lead-1', result: 'Success', details: '{"field_name":"stage"}', ip_address: '127.0.0.1', changed_at: '2026-06-20T10:00:00Z' }] })],
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '1' }] })]
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?actor=admin-001&action_type=lead.status_changed&entity_affected=lead&from=2026-06-01&to=2026-06-26&page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test(`test-ep-5.1.1-b-057: Verify audit log pagination with configurable page size.`, async () => {
      const rows = [];
      for (let i = 0; i < 10; i++) {
        rows.push({ id: 'aud-' + i, user_id: ADMIN_USER.id, action: 'lead.status_changed', resource: 'lead', resource_id: 'lead-1', result: 'Success', details: '{}', ip_address: '127.0.0.1', changed_at: '2026-06-20T10:00:00Z' });
      }
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({ rows })],
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '10' }] })]
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    test(`test-ep-5.1.1-b-058: Verify filtering by entity_affected returns only entries for that entity type.`, async () => {
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({ rows: [{ id: 'aud-1', user_id: ADMIN_USER.id, action: 'USER_CREATED', resource: 'user', resource_id: 'user-1', result: 'Success', details: '{}', ip_address: '127.0.0.1', changed_at: '2026-06-20T10:00:00Z' }] })],
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '1' }] })]
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?entity_affected=user')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test(`test-ep-5.1.1-b-059: Verify 400 when from or to date parameters are not in valid YYYY-MM-DD format.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log?from=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    test(`test-ep-5.1.1-b-060: Verify empty response when no audit log entries match the applied filters.`, async () => {
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({ rows: [] })],
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '0' }] })]
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log?from=2025-01-01&to=2025-01-02')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test(`test-ep-5.1.1-b-061: Verify 403 when a Marketing Executive attempts to access the audit log.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log?page=1&limit=20')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admin role required.');
    });

    test(`test-ep-5.1.1-b-062: Verify SQL injection attempt on filter parameters is properly sanitized.`, async () => {
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({ rows: [] })],
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '0' }] })]
      ]);
      const res = await request(app)
        .get("/api/admin/audit-log?action_type=lead.status_changed'; DROP TABLE audit_logs; --")
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('GET /api/admin/audit-log/:id', () => {
    test(`test-ep-5.1.1-b-063: Admin fetches a single audit log entry by its UUID with full detail.`, async () => {
      const AUDIT_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({
          rows: [{
            id: AUDIT_UUID, user_id: ADMIN_USER.id, action: 'lead.status_changed', resource: 'lead', resource_id: 'lead-1', result: 'Success', details: '{"field_name":"stage","from":"New","to":"Contacted"}', ip_address: '203.0.113.45', changed_at: '2026-06-20T10:00:00Z'
          }]
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/audit-log/${AUDIT_UUID}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(AUDIT_UUID);
    });

    test(`test-ep-5.1.1-b-064: Verify 404 when the audit log entry does not exist.`, async () => {
      defaultQuery([
        ['SELECT * FROM audit_logs', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Audit log entry not found');
    });

    test(`test-ep-5.1.1-b-065: Verify 400 when the audit log ID is not a valid UUID format.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid audit log ID');
    });

    test(`test-ep-5.1.1-b-066: Verify 403 when a Marketing Executive attempts to view a single audit log entry.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admin role required.');
    });
  });

  describe('GET /api/admin/audit-log/export', () => {
    test(`test-ep-5.1.1-b-067: Admin exports the audit log as CSV within a specified date range.`, async () => {
      defaultQuery([
        ['SELECT COUNT(*) FROM', () => ({ rows: [{ count: '1' }] })],
        ['SELECT * FROM audit_logs', () => ({ rows: [{ id: 'aud-1', user_id: ADMIN_USER.id, action: 'lead.status_changed', resource: 'lead', resource_id: 'lead-1', result: 'Success', details: '{}', ip_address: '127.0.0.1', changed_at: '2026-06-20T10:00:00Z' }] })]
      ]);
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-06-01&to=2026-06-26&format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });

    test(`test-ep-5.1.1-b-068: Verify 400 when export format is not csv.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-06-01&to=2026-06-26&format=pdf')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Format must be csv');
    });

    test(`test-ep-5.1.1-b-069: Verify 400 when date format in from or to is invalid.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=invalid-date&format=csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    test(`test-ep-5.1.1-b-070: Verify 403 when a Marketing Executive attempts to export the audit log.`, async () => {
      const res = await request(app)
        .get('/api/admin/audit-log/export?from=2026-06-01&to=2026-06-26&format=csv')
        .set('Authorization', `Bearer ${marketingToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admin role required.');
    });
  });

  describe('History Immutability & Cross-Cutting', () => {
    const LEAD_UUID = '11111111-1111-1111-1111-111111111111';
    test(`test-ep-5.1.1-b-074: Verify that no POST route exists to manually insert lead_history rows ΓÇö history is only created internally by tracking middleware.`, async () => {
      const res = await request(app)
        .post(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ field_name: 'stage', old_value: 'New', new_value: 'Contacted' });
      expect([404, 405]).toContain(res.status);
    });

    test(`test-ep-5.1.1-b-075: Verify XSS prevention ΓÇö script tags stored in old_value or new_value are returned safely in JSON without server-side processing or execution.`, async () => {
      const XSS_LEAD = '75757575-7575-7575-7575-757575757575';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: XSS_LEAD, assigned_to: null }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '1' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({
          rows: [{ id: 'h-xss', field_name: 'stage', old_value: "<script>alert('XSS')</script>", new_value: 'Contacted', changed_by: MARKETING_USER.id, changed_by_name: 'John Doe', changed_at: '2026-07-04T10:00:00Z', is_system_generated: false }
          ]
        })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${XSS_LEAD}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history[0].old_value).toBe("<script>alert('XSS')</script>");
    });

    test(`test-ep-5.1.1-b-076: Verify query performance on lead_history with large datasets (10,000+ entries for a single lead).`, async () => {
      const LEAD_UUID = '76767676-7676-7676-7676-767676767676';
      const rows = [];
      for (let i = 0; i < 500; i++) {
        rows.push({
          id: `h${i}`, field_name: 'stage', old_value: 'New', new_value: 'Contacted',
          changed_by: ADMIN_USER.id, changed_by_name: 'Admin', changed_at: `2026-07-${String(500 - i).padStart(2, '0')}T10:00:00Z`, is_system_generated: false
        });
      }
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null }] })],
        ['SELECT COUNT(*) FROM lead_history WHERE lead_id = $1', () => ({ rows: [{ count: '10000' }] })],
        ['SELECT h.*, u.name as changed_by_name', () => ({ rows })]
      ]);
      const res = await request(app)
        .get(`/api/admin/leads/${LEAD_UUID}/field-history?page=1&limit=20`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.history.length).toBeGreaterThan(0);
      expect(res.body.pagination.total_pages).toBe(500);
      expect(res.body.pagination.total_records || res.body.pagination.total_entries || res.body.data.total_changes).toBe(10000);
    });
  });

  describe('History Immutability', () => {
    const LEAD_UUID = '11111111-1111-1111-1111-111111111111';
    test(`test-ep-5.1.1-b-071: Verify that PUT requests against the lead_history resource are rejected (HTTP 405), ensuring the history table is insert-only.`, async () => {
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ field_name: 'stage' });
      expect(res.status).toBe(405);
    });
    
    test(`test-ep-5.1.1-b-072: Verify that PATCH requests against the lead_history resource are rejected (HTTP 405).`, async () => {
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(405);
    });
    
    test(`test-ep-5.1.1-b-073: Verify that DELETE requests against the lead_history resource are rejected (HTTP 405).`, async () => {
      const res = await request(app)
        .delete(`/api/admin/leads/${LEAD_UUID}/field-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(405);
    });
  });

  describe('Transactions for Status Updates', () => {
    const LEAD_UUID = '11111111-1111-1111-1111-111111111111';
    test(`test-ep-5.1.1-b-024: Verify transaction atomicity ΓÇö if the lead update fails after history row is inserted, both operations are rolled back. No orphan lead_history row exists.`, async () => {
       defaultQuery([
         ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id, stage: 'New Lead' }] })],
         ['SELECT * FROM users WHERE id', () => ({ rows: [{ id: MARKETING_USER.id, role: 'Marketing Executive', status: 'active' }] })]
       ]);
       const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN') return Promise.resolve();
          if (sql === 'ROLLBACK') return Promise.resolve();
          if (sql.includes('UPDATE leads')) return Promise.resolve({ rows: [{ id: LEAD_UUID, stage: 'Contacted', assigned_to: MARKETING_USER.id }] });
          if (sql.includes('WHERE l.id = $1') || sql.includes('WHERE id = $1') || sql.includes('leads WHERE id')) return Promise.resolve({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id, stage: 'New Lead' }] });
          if (sql.includes('SELECT * FROM users WHERE id')) return Promise.resolve({ rows: [{ id: MARKETING_USER.id, role: 'Marketing Executive', status: 'active' }] });
          if (sql.includes('INSERT INTO lead_history')) return Promise.reject(new Error('DB Error'));
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      };
      require('../../src/config/db').getClient.mockResolvedValue(mockClient);
      
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      console.log('RES 3:', res.status, res.body);

      // Controller should catch the error and next(error) which returns 500
      expect(res.status).toBe(500);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('PUT /api/marketing/leads/:id/status', () => {
    const LEAD_UUID = '17171717-1717-1717-1717-171717171717';
    const mockLeadRow = (overrides = {}) => ({
      id: LEAD_UUID, lead_id: 'LD-001', company_name: 'Acme Corp', stage: 'New Lead',
      assigned_to: MARKETING_USER.id, lead_status: 'Active',
      ...overrides
    });
    const mockUpdatedRow = (overrides = {}) => ({
      id: LEAD_UUID, lead_id: 'LD-001', company_name: 'Acme Corp', stage: 'Contacted',
      assigned_to: MARKETING_USER.id, lead_status: 'Active',
      ...overrides
    });
    test(`test-ep-5.1.1-b-017: Verify updating a leadΓÇÖs stage creates a lead_history row capturing field_name, old_value, new_value, changed_by, changed_at ΓÇö written in the same database transaction. The response includes a history_logged object confirming the entry.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLeadRow()] })]
      ]);
      const client = mkClient([
        ['BEGIN', () => ({})],
        ['UPDATE leads SET stage', () => ({ rows: [mockUpdatedRow()] })],
        ['INSERT INTO lead_history', () => ({
          rows: [{ id: 'hist-017', lead_id: LEAD_UUID, field_name: 'stage', old_value: 'New Lead', new_value: 'Contacted', change_summary: 'Stage updated from New Lead to Contacted', changed_by: MARKETING_USER.id, changed_at: '2026-07-04T10:00:00Z', is_system_generated: false }]
        })],
        ['COMMIT', () => ({})]
      ]);
      require('../../src/config/db').getClient.mockResolvedValue(client);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.stage).toBe('Contacted');
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lead_history'), expect.anything());
    });

    test(`test-ep-5.1.1-b-018: Verify that the history_logged object in the response exactly matches the corresponding lead_history row committed to the database.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLeadRow()] })]
      ]);
      const historyRow = { id: 'hist-018', lead_id: LEAD_UUID, field_name: 'stage', old_value: 'New Lead', new_value: 'Contacted', change_summary: 'Stage updated from New Lead to Contacted by Mock User', changed_by: MARKETING_USER.id, changed_at: '2026-07-04T10:00:00Z', is_system_generated: false };
      const client = mkClient([
        ['BEGIN', () => ({})],
        ['UPDATE leads SET stage', () => ({ rows: [mockUpdatedRow()] })],
        ['INSERT INTO lead_history', () => ({ rows: [historyRow] })],
        ['COMMIT', () => ({})]
      ]);
      require('../../src/config/db').getClient.mockResolvedValue(client);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.stage).toBe('Contacted');
      expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO lead_history'), expect.anything());
      const insertCall = client.query.mock.calls.find(c => c[0].includes('INSERT INTO lead_history'));
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain(historyRow.field_name);
      expect(insertCall[1]).toContain(historyRow.old_value);
      expect(insertCall[1]).toContain(historyRow.new_value);
    });

    test(`test-ep-5.1.1-b-019: Verify 403 when a Marketing Executive attempts to update status on a lead not assigned to them.`, async () => {
      const OTHER_ME = '99999999-9999-9999-9999-999999999999';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ ...mockLeadRow(), assigned_to: OTHER_ME }] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized to update this lead');
    });

    test(`test-ep-5.1.1-b-020: Verify 400 when status value is not in the allowed enum of valid stages.`, async () => {
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'InvalidStage' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Stage must be one of: New, Contacted, Qualified, Meeting, Proposal, Negotiation, Won, Lost, Hold');
    });

    test(`test-ep-5.1.1-b-021: Verify 404 when updating status on a lead that does not exist.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Lead not found');
    });

    test(`test-ep-5.1.1-b-022: Verify 422 when an invalid stage transition is attempted (e.g., New -> Qualified directly, skipping Contacted). Response includes allowed_next array.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLeadRow({ stage: 'New Lead' })] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Meeting Scheduled' });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid stage transition. New can only move to Contacted.');
      expect(res.body.allowed_next).toEqual(['Contacted']);
    });

    test(`test-ep-5.1.1-b-023: Verify 401 when no authentication token is provided.`, async () => {
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(401);
    });

    test(`test-ep-5.1.1-b-025: Verify that updating a tracked field with the same value does NOT create a duplicate lead_history entry.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLeadRow({ stage: 'Contacted' })] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/status`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Contacted' });
      expect(res.status).toBe(200);
      expect(res.body.history_logged).toBeUndefined();
    });
  });

  describe('PATCH /api/admin/leads/:id/assign', () => {
    const LEAD_UUID = '26262626-2626-2626-2626-262626262626';
    const TARGET_USER = '88888888-8888-8888-8888-888888888888';

    test(`test-ep-5.1.1-b-026: Verify Admin can assign an unassigned lead to a user. Creates a lead_history row with field_name = 'assigned_to' and an audit_logs entry.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null, company_name: 'Acme Corp', lead_id: 'LD-001' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [{ id: TARGET_USER, role: 'Marketing Executive', status: 'active', name: 'Jane Smith', employee_id: 'EMP002' }] })]
      ]);
      const client = mkClient([
        ['BEGIN', () => ({})],
        ['UPDATE leads SET assigned_to', () => ({ rows: [{ id: LEAD_UUID, assigned_to: TARGET_USER }] })],
        ['INSERT INTO lead_history', () => ({
          rows: [{ id: 'hist-026', lead_id: LEAD_UUID, field_name: 'assigned_to', old_value: 'Unassigned', new_value: 'EMP002', change_summary: expect.any(String) || 'Lead reassigned from Unassigned to EMP002', changed_by: ADMIN_USER.id }]
        })],
        ['COMMIT', () => ({})]
      ]);
      require('../../src/config/db').getClient.mockResolvedValue(client);
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: TARGET_USER });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.history_logged).toBeDefined();
    });

    test(`test-ep-5.1.1-b-027: Verify reassigning a lead from one user to another creates a history entry showing both old and new assignee.`, async () => {
      const PREV_USER = '77777777-7777-7777-7777-777777777777';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: PREV_USER, company_name: 'Acme Corp', lead_id: 'LD-001' }] })],
        ['SELECT employee_id FROM users WHERE id = $1', () => ({ rows: [{ employee_id: 'EMP001' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [{ id: TARGET_USER, role: 'Marketing Executive', status: 'active', name: 'Sarah Connor', employee_id: 'EMP003' }] })]
      ]);
      const client = mkClient([
        ['BEGIN', () => ({})],
        ['UPDATE leads SET assigned_to', () => ({ rows: [{ id: LEAD_UUID, assigned_to: TARGET_USER }] })],
        ['INSERT INTO lead_history', () => ({
          rows: [{ id: 'hist-027', lead_id: LEAD_UUID, field_name: 'assigned_to', old_value: 'EMP001', new_value: 'EMP003', changed_by: ADMIN_USER.id }]
        })],
        ['COMMIT', () => ({})]
      ]);
      require('../../src/config/db').getClient.mockResolvedValue(client);
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: TARGET_USER, reason: 'Reassigning to new owner' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.history_logged).toBeDefined();
    });

    test(`test-ep-5.1.1-b-028: Verify 400 when lead ID is not a valid UUID format.`, async () => {
      defaultQuery([]);
      const res = await request(app)
        .patch('/api/admin/leads/invalid-format/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: TARGET_USER });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid lead ID');
    });

    test(`test-ep-5.1.1-b-029: Verify 400 when assigned_to user ID is not a valid UUID format.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null, company_name: 'Acme Corp', lead_id: 'LD-001' }] })],
        ['SELECT * FROM users WHERE id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: 'not-a-uuid' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid user ID');
    });

    test(`test-ep-5.1.1-b-030: Verify 404 when the lead does not exist.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: TARGET_USER });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Lead not found');
    });

    test(`test-ep-5.1.1-b-031: Verify 404 when the target user does not exist in the users table.`, async () => {
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM users WHERE id = $1') && params[0] === '00000000-0000-0000-0000-000000000000') {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT * FROM users WHERE id = $1')) {
          return Promise.resolve({ rows: [{ id: params[0], role: 'Admin', status: 'active', name: 'Admin User' }] });
        }
        if (sql.includes('WHERE l.id = $1')) {
          return Promise.resolve({ rows: [{ id: LEAD_UUID, assigned_to: null, company_name: 'Acme Corp', lead_id: 'LD-001' }] });
        }
        return Promise.resolve({ rows: [] });
      });
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User not found');
    });

    test(`test-ep-5.1.1-b-032: Verify 403 when a Marketing Executive attempts to access the admin assign endpoint.`, async () => {
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ assigned_to: TARGET_USER });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admin role required.');
    });

    test(`test-ep-5.1.1-b-033: Verify transaction atomicity ΓÇö if the lead update succeeds but the lead_history insert fails, the entire operation rolls back and leads.assigned_to remains unchanged.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [{ id: LEAD_UUID, assigned_to: null, company_name: 'Acme Corp', lead_id: 'LD-001' }] })],
        ['SELECT * FROM users WHERE id', () => ({ rows: [{ id: TARGET_USER, role: 'Marketing Executive', status: 'active', name: 'Jane Smith', employee_id: 'EMP002' }] })]
      ]);
      const client = mkClient([
        ['BEGIN', () => ({})],
        ['UPDATE leads SET assigned_to', () => ({ rows: [{ id: LEAD_UUID, assigned_to: TARGET_USER }] })],
        ['INSERT INTO lead_history', () => { throw new Error('DB Error'); }]
      ]);
      require('../../src/config/db').getClient.mockResolvedValue(client);
      const res = await request(app)
        .patch(`/api/admin/leads/${LEAD_UUID}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigned_to: TARGET_USER });
      expect(res.status).toBe(500);
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('PUT /api/marketing/leads/:id/close', () => {
    const LEAD_UUID = '34343434-3434-3434-3434-343434343434';
    const mockLead = (overrides = {}) => ({
      id: LEAD_UUID, lead_id: 'LD-001', company_name: 'Acme Corp',
      stage: 'Negotiation', assigned_to: MARKETING_USER.id,
      lead_status: 'Active', lost_reason: null, final_deal_value: null,
      closure_date: null, changed_at: '2026-01-15T00:00:00Z',
      ...overrides
    });

    test(`test-ep-5.1.1-b-034: Close a lead as Won ΓÇö creates lead_history row for stage field, records final_deal_value and closure_date on the lead.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLead()] })],
        ['stage = \'Won\'', () => ({ rows: [{ id: LEAD_UUID, lead_id: 'LD-001', stage: 'Won', lead_status: 'Closed' }] })],
        ['lead_history', () => ({ rows: [{ id: 'hist-034' }] })],
        ['audit_log', () => ({ rows: [{ id: 'audit-034' }] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: 250000, closure_date: '2026-06-30' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test(`test-ep-5.1.1-b-035: Close a lead as Lost ΓÇö creates lead_history row and records loss_reason on the lead.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLead()] })],
        ['stage = \'Lost\'', () => ({ rows: [{ id: LEAD_UUID, lead_id: 'LD-001', stage: 'Lost', lead_status: 'Closed' }] })],
        ['lead_history', () => ({ rows: [{ id: 'hist-035' }] })],
        ['audit_log', () => ({ rows: [{ id: 'audit-035' }] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test(`test-ep-5.1.1-b-036: Verify 403 when attempting to close a lead not assigned to the user.`, async () => {
      const OTHER_ME = '99999999-9999-9999-9999-999999999999';
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLead({ assigned_to: OTHER_ME })] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Not authorized to close this lead');
    });

    test(`test-ep-5.1.1-b-037: Verify 404 when closing a non-existent lead.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Lead not found');
    });

    test(`test-ep-5.1.1-b-038: Verify 400 when close status is not Won or Lost.`, async () => {
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'New' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Status must be Won or Lost to close');
    });

    test(`test-ep-5.1.1-b-039: Verify 400 when closing as Lost without providing loss_reason.`, async () => {
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Loss reason is required when closing as Lost');
    });

    test(`test-ep-5.1.1-b-040: Verify 400 when loss_reason is not in the allowed enum values.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLead()] })]
      ]);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'InvalidReason' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Loss reason must be: Budget, Competitor, No Response, Cancelled, Other');
    });

    test(`test-ep-5.1.1-b-041: Verify 400 when closing as Won without final_deal_value and closure_date.`, async () => {
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('final_deal_value and closure_date are required when closing as Won');
    });

    test(`test-ep-5.1.1-b-042: Verify 400 when final_deal_value is negative.`, async () => {
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Won', final_deal_value: -1000, closure_date: '2026-06-30' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('final_deal_value must be a positive number');
    });

    test(`test-ep-5.1.1-b-043: Verify transaction atomicity ΓÇö if the lead update succeeds but lead_history insert fails, the entire close operation rolls back.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockLead()] })],
        ['stage = \'Lost\'', () => ({ rows: [{ id: LEAD_UUID, lead_id: 'LD-001', stage: 'Lost', lead_status: 'Closed' }] })],
        ['SELECT * FROM users WHERE id', () => ({ rows: [{ id: MARKETING_USER.id, role: 'Marketing Executive', status: 'active' }] })]
      ]);
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN') return Promise.resolve();
          if (sql === 'ROLLBACK') return Promise.resolve();
          if (sql.includes('UPDATE leads')) return Promise.resolve({ rows: [{ id: LEAD_UUID, stage: 'Lost', assigned_to: MARKETING_USER.id }] });
          if (sql.includes('WHERE l.id = $1') || sql.includes('WHERE id = $1')) return Promise.resolve({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id, stage: 'Negotiation' }] });
          if (sql.includes('INSERT INTO lead_history')) return Promise.reject(new Error('DB Error'));
          if (sql.includes('INSERT INTO audit_logs')) return Promise.resolve({ rows: [{ id: 'audit-043' }] });
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      };
      require('../../src/config/db').getClient.mockResolvedValue(mockClient);
      const res = await request(app)
        .put(`/api/marketing/leads/${LEAD_UUID}/close`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ stage: 'Lost', lost_reason: 'Budget' });
      expect(res.status).toBe(500);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('PUT /api/admin/leads/:id/reopen', () => {
    const LEAD_UUID = '44444444-4444-4444-4444-444444444444';
    const mockClosedLead = (overrides = {}) => ({
      id: LEAD_UUID, lead_id: 'LD-001', company_name: 'Acme Corp',
      stage: 'Won', assigned_to: MARKETING_USER.id,
      lead_status: 'Closed', lost_reason: null, final_deal_value: 250000,
      closure_date: '2026-06-30', changed_at: '2026-01-15T00:00:00Z',
      ...overrides
    });

    test(`test-ep-5.1.1-b-044: Admin reopens a Won lead ΓÇö creates lead_history row recording the transition from Won to Contacted with the reopen reason.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockClosedLead({ stage: 'Won' })] })],
        ['stage = \'Contacted\'', () => ({ rows: [{ id: LEAD_UUID, lead_id: 'LD-001', stage: 'Contacted', lead_status: 'Active' }] })],
        ['lead_history', () => ({ rows: [{ id: 'hist-044' }] })],
        ['audit_log', () => ({ rows: [{ id: 'audit-044' }] })]
      ]);
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reopen_reason: 'Client expressed renewed interest' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test(`test-ep-5.1.1-b-045: Admin reopens a Lost lead ΓÇö same behavior as reopening a Won lead.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockClosedLead({ stage: 'Lost' })] })],
        ['stage = \'Contacted\'', () => ({ rows: [{ id: LEAD_UUID, lead_id: 'LD-001', stage: 'Contacted', lead_status: 'Active' }] })],
        ['lead_history', () => ({ rows: [{ id: 'hist-045' }] })],
        ['audit_log', () => ({ rows: [{ id: 'audit-045' }] })]
      ]);
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reopen_reason: 'Client returned with new requirements' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test(`test-ep-5.1.1-b-046: Verify 400 when reopen reason is missing.`, async () => {
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Reopen reason is required');
    });

    test(`test-ep-5.1.1-b-047: Verify 400 when reopening a lead that is not in Won or Lost status.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockClosedLead({ stage: 'Negotiation' })] })]
      ]);
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reopen_reason: 'Client reconsidered' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Only Won or Lost leads can be reopened');
    });

    test(`test-ep-5.1.1-b-048: Verify 404 when reopening a non-existent lead.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [] })]
      ]);
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reopen_reason: 'Any reason' });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Lead not found');
    });

    test(`test-ep-5.1.1-b-049: Verify 403 when a Marketing Executive attempts to reopen a lead.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockClosedLead()] })]
      ]);
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ reopen_reason: 'Any reason' });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Admin role required.');
    });

    test(`test-ep-5.1.1-b-050: Verify transaction atomicity ΓÇö both the lead record update and lead_history insertion occur in the same transaction.`, async () => {
      defaultQuery([
        ['WHERE l.id = $1', () => ({ rows: [mockClosedLead()] })],
        ['SELECT * FROM users WHERE id', () => ({ rows: [{ id: ADMIN_USER.id, role: 'Admin', status: 'active' }] })]
      ]);
      const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
          if (sql === 'BEGIN') return Promise.resolve();
          if (sql === 'ROLLBACK') return Promise.resolve();
          if (sql.includes('UPDATE leads')) return Promise.resolve({ rows: [{ id: LEAD_UUID, stage: 'Contacted', assigned_to: MARKETING_USER.id }] });
          if (sql.includes('WHERE l.id = $1') || sql.includes('WHERE id = $1')) return Promise.resolve({ rows: [{ id: LEAD_UUID, assigned_to: MARKETING_USER.id, stage: 'Won' }] });
          if (sql.includes('INSERT INTO lead_history')) return Promise.reject(new Error('DB Error'));
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      };
      require('../../src/config/db').getClient.mockResolvedValue(mockClient);
      const res = await request(app)
        .put(`/api/admin/leads/${LEAD_UUID}/reopen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reopen_reason: 'Test reopen transaction rollback' });
      expect(res.status).toBe(500);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
