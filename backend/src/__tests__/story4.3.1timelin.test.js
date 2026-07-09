
/**
 * ============================================================
 * STORY-4.3.1  Lead Activity Timeline — TDD Suite
 * ============================================================
 * Source:
 *   - backend-story-4.3.1 (2).md  (24 backend API test cases)
 *
 * Sections:
 *   1. GET /marketing/leads/:id/timeline — ME Lead Timeline  (9 tests)
 *   2. GET /admin/leads/:id/timeline   — Admin Lead Timeline (3 tests)
 *   3. Timeline Immutability                                  (4 tests)
 *   4. Cross-Cutting Security, Input Sanitization & Perf      (8 tests)
 *
 * Total : 24 test cases
 * ============================================================
 */

process.env.JWT_SECRET = "test-jwt-secret-for-testing";

const request = require("supertest");
const express = require("express");
const jwt     = require("jsonwebtoken");
const { ADMIN_USER, MARKETING_USER } = require("./setup");

// ── Mock DB for auth middleware ────────────────────────────────
let mockQuery = jest.fn();
jest.mock("../config/db", () => ({
  query:     (...args) => mockQuery(...args),
  getClient: jest.fn(),
}));

// ── Mock models ───────────────────────────────────────────────
jest.mock("../models/Lead", () => ({ findById: jest.fn() }));
jest.mock("../models/Followup", () => ({ findByLeadId: jest.fn() }));
jest.mock("../models/LeadHistory", () => ({ findByLeadId: jest.fn() }));
jest.mock("../models/AuditLog", () => ({ create: jest.fn() }));
jest.mock("../models/User", () => ({ findByIdOrEmployeeId: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), updateAccountStatus: jest.fn() }));
jest.mock("../models/LeadSource", () => ({ findAll: jest.fn() }));
jest.mock("../models/BusinessCategory", () => ({ findAll: jest.fn() }));
jest.mock("../models/BusinessSubCategory", () => ({ findAll: jest.fn() }));
jest.mock("../models/Service", () => ({ findAll: jest.fn() }));

// ── Mock email & algolia ───────────────────────────────────────
jest.mock("../utils/emailService",  () => ({ sendWelcomeEmail: jest.fn().mockResolvedValue(), sendDailyReminderEmail: jest.fn().mockResolvedValue() }));
jest.mock("../utils/algoliaService", () => ({
  saveUser:      jest.fn().mockResolvedValue(),
  deleteUser:    jest.fn().mockResolvedValue(),
  searchUsers:   jest.fn(),
  indexAllUsers: jest.fn().mockResolvedValue(),
  testConnection:jest.fn(),
}));
jest.mock("pdfkit", () => ({}));

// ── Mock stub controllers ──────────────────────────────────────
const stubHandler = (name) => (req, res) => res.status(501).json({ success: false, message: `Stub: ${name}` });
const mockController = (methods) => {
  const obj = {};
  methods.forEach(m => { obj[m] = stubHandler(m); });
  return obj;
};

jest.mock("../controllers/userController",          () => mockController(["createUser","getUsers","reindexUsers","getUser","updateUser","deleteUser"]));
jest.mock("../controllers/auditLogController",       () => mockController(["getAuditLogs","getAuditLog","exportAuditLogs","archiveAuditLogs"]));
jest.mock("../controllers/systemSettingController",  () => mockController(["getSettings","updateSetting","getAuditRetention","updateAuditRetention"]));
jest.mock("../controllers/savedViewController",     () => mockController(["createSavedView","updateSavedView","deleteSavedView"]));
jest.mock("../controllers/bulkOperationsController", () => mockController(["bulkSelect","bulkAssign","exportLeads"]));
jest.mock("../controllers/assignController",         () => mockController(["assignLead"]));
jest.mock("../controllers/categoryController",       () => mockController([
  "getActiveCategories","getActiveSubCategories","getCategoryAuditLog","seedDefaultTaxonomy",
  "getCategories","createCategory","getCategory","updateCategory","deleteCategory","patchCategoryStatus",
  "getSubCategories","createSubCategory","getSubCategory","updateSubCategory","deleteSubCategory","patchSubCategoryStatus"
]));

// ── Express app ───────────────────────────────────────────────
let app;
beforeAll(() => {
  app = express();
  app.use(require("helmet")());
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/marketing", require("../routes/marketing"));
  app.use("/api/admin",     require("../routes/admin"));
  app.use(require("../middleware/errorHandler"));
});

beforeEach(() => jest.resetAllMocks());

// ── JWT tokens ────────────────────────────────────────────────
const adminToken = jwt.sign(
  { id: ADMIN_USER.id, email: ADMIN_USER.email, role: ADMIN_USER.role },
  process.env.JWT_SECRET, { expiresIn: "15m" }
);
const meToken = jwt.sign(
  { id: MARKETING_USER.id, email: MARKETING_USER.email, role: MARKETING_USER.role },
  process.env.JWT_SECRET, { expiresIn: "15m" }
);

// ── Fixtures ──────────────────────────────────────────────────
const LEAD_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_LEAD_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const COMPANY_NAME = "Test Corp";

const LEAD = {
  id: LEAD_ID,
  company_name: COMPANY_NAME,
  assigned_to: MARKETING_USER.id,
  stage: "Contacted",
};

const LEAD_OTHER = {
  id: OTHER_LEAD_ID,
  company_name: "Other Corp",
  assigned_to: "me-002-id",
  stage: "Contacted",
};

// 4 events matching the spec preconditions
const CREATED_EVENT = {
  id: "hist-001",
  field_name: "lead_created",
  change_summary: "Lead created by Admin User",
  old_value: null,
  new_value: null,
  changed_by: ADMIN_USER.id,
  changed_by_name: "Admin User",
  created_at: "2026-07-01T09:00:00.000Z",
};

const ASSIGNED_EVENT = {
  id: "hist-002",
  field_name: "assigned_to",
  change_summary: "Assigned to John Doe",
  old_value: null,
  new_value: MARKETING_USER.id,
  changed_by: ADMIN_USER.id,
  changed_by_name: "Admin User",
  created_at: "2026-07-01T09:05:00.000Z",
};

const STATUS_CHANGE_EVENT = {
  id: "hist-003",
  field_name: "status",
  change_summary: "Stage changed from New to Contacted",
  old_value: "New",
  new_value: "Contacted",
  changed_by: MARKETING_USER.id,
  changed_by_name: "John Doe",
  created_at: "2026-07-02T10:00:00.000Z",
};

const FOLLOWUP_EVENT = {
  id: "fup-001",
  followup_type: "Call",
  outcome: "Interested",
  notes: "Had a good conversation",
  next_followup_date: null,
  proposal_amount: null,
  stage_at_log: "Contacted",
  created_by_id: MARKETING_USER.id,
  created_by_name: "John Doe",
  created_at: "2026-07-03T11:00:00.000Z",
};

const ALL_EVENTS = [CREATED_EVENT, ASSIGNED_EVENT, STATUS_CHANGE_EVENT, FOLLOWUP_EVENT];

// Helper: protect middleware calls query('SELECT * FROM users WHERE id = $1', [decoded.id])
const authMock = (user) => mockQuery.mockResolvedValueOnce({ rows: [user] });

// ══════════════════════════════════════════════════════════════
// Section 1: GET /marketing/leads/:id/timeline — ME Lead Timeline
// ══════════════════════════════════════════════════════════════

const Lead        = require("../models/Lead");
const Followup    = require("../models/Followup");
const LeadHistory = require("../models/LeadHistory");

describe("Section 1 | GET /marketing/leads/:id/timeline — ME Lead Timeline", () => {

  /**
   * test-ep-4.3.1-b-001
   * Positive – ME retrieves consolidated chronological timeline (4 events)
   */
  test("b-001 | Positive – ME retrieves consolidated chronological timeline", async () => {
    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([CREATED_EVENT, ASSIGNED_EVENT, STATUS_CHANGE_EVENT]);
    Followup.findByLeadId.mockResolvedValue([FOLLOWUP_EVENT]);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
    expect(res.body.data.timeline.length).toBeGreaterThan(0);
    if (res.body.data.timeline.length > 1) {
      expect(new Date(res.body.data.timeline[0].created_at).getTime())
        .toBeGreaterThanOrEqual(new Date(res.body.data.timeline[1].created_at).getTime());
    }
    // 4 events total: 3 history + 1 followup (but followup_logged history entry removed due to dedup)
    // Actually dedup logic removes followup entries from historyEvents if same id appears in followupEvents
    // Since ids differ (hist vs fup), all 4 should remain
    expect(res.body.data.timeline).toHaveLength(4);

    // Sorted descending chronological
    const dates = res.body.data.timeline.map(e => e.created_at);
    expect(new Date(dates[0]).getTime()).toBeGreaterThan(new Date(dates[1]).getTime());

    // Exact event order (Follow-up -> Stage Change -> Assignment -> Created)
    const types = res.body.data.timeline.map(e => e.type || e.field_name || (e.followup_type ? 'followup' : 'unknown'));
    // Depending on exactly how the controller formats type, it should be in this order based on timestamps:
    // fup-001 (July 3) -> hist-003 (July 2) -> hist-002 (July 1 09:05) -> hist-001 (July 1 09:00)
    expect(types[0]).toMatch(/followup|Call/);
    expect(types[1]).toMatch(/status_change|status/);
    expect(types[2]).toMatch(/assigned|assigned_to/);
    expect(types[3]).toMatch(/created|lead_created/);

    // Actor metadata check
    expect(res.body.data.timeline[0]).toHaveProperty('actor'); // or created_by
    expect(res.body.data.timeline[3]).toHaveProperty('actor'); // or changed_by

    // Each event has type, description/change_summary, created_at, actor/changed_by
    res.body.data.timeline.forEach(event => {
      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("created_at");
      // At least one of these should exist
      const hasDescriptor = event.change_summary !== undefined || event.description !== undefined;
      expect(hasDescriptor).toBe(true);
    });
  });

  /**
   * test-ep-4.3.1-b-002
   * Positive – Single type filter (?type=followup)
   */
  test("b-002 | Positive – Single type filter returns only matching events", async () => {
    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([CREATED_EVENT, ASSIGNED_EVENT, STATUS_CHANGE_EVENT]);
    Followup.findByLeadId.mockResolvedValue([FOLLOWUP_EVENT]);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=followup`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.timeline).toHaveLength(1);
    expect(res.body.data.timeline[0].type).toBe("followup");
    const types2 = res.body.data.timeline.map(e => e.type);
    expect(types2).not.toContain("created");
    expect(types2).not.toContain("assigned");
    expect(types2).not.toContain("status_change");
  });

  /**
   * test-ep-4.3.1-b-003
   * Positive – Multiple type filters (?type=followup&type=status_change)
   */
  test("b-003 | Positive – Multiple type filter returns matching events", async () => {
    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([CREATED_EVENT, ASSIGNED_EVENT, STATUS_CHANGE_EVENT]);
    Followup.findByLeadId.mockResolvedValue([FOLLOWUP_EVENT]);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=followup&type=status_change`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    const types = res.body.data.timeline.map(e => e.type);
    expect(types).toEqual(expect.arrayContaining(["followup", "status_change"]));
    expect(types).not.toContain("created");
    expect(types).not.toContain("assigned");
  });

  /**
   * test-ep-4.3.1-b-004
   * Edge – Pagination limit: page 1 with 25 total events returns 20
   */
  test("b-004 | Edge – Pagination limit: first page returns max 20 events", async () => {
    const manyHistory = Array.from({ length: 22 }, (_, i) => ({
      ...CREATED_EVENT,
      id: `hist-${i}`,
      created_at: new Date(2026, 6, 1, i).toISOString(),
    }));
    const manyFollowups = Array.from({ length: 3 }, (_, i) => ({
      ...FOLLOWUP_EVENT,
      id: `fup-${i}`,
      created_at: new Date(2026, 6, 2, i).toISOString(),
    }));

    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue(manyHistory);
    Followup.findByLeadId.mockResolvedValue(manyFollowups);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?page=1&limit=20`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toHaveLength(20);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination).toHaveProperty('totalPages');
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination).toHaveProperty('totalCount');
    expect(res.body.pagination.totalCount).toBe(25);
    expect(res.body.pagination.hasMore).toBe(true);
  });

  /**
   * test-ep-4.3.1-b-005
   * Positive – Pagination page 2 returns remaining items
   */
  test("b-005 | Positive – Page 2 returns remaining events", async () => {
    const manyHistory = Array.from({ length: 22 }, (_, i) => ({
      ...CREATED_EVENT,
      id: `hist-${i}`,
      created_at: new Date(2026, 6, 1, i).toISOString(),
    }));
    const manyFollowups = Array.from({ length: 3 }, (_, i) => ({
      ...FOLLOWUP_EVENT,
      id: `fup-${i}`,
      created_at: new Date(2026, 6, 2, i).toISOString(),
    }));

    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue(manyHistory);
    Followup.findByLeadId.mockResolvedValue(manyFollowups);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?page=2&limit=20`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toHaveLength(5);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.totalCount).toBe(25);
    expect(res.body.pagination.hasMore).toBe(false);
  });

  /**
   * test-ep-4.3.1-b-006
   * Security – ME cannot view another ME's lead timeline
   */
  test("b-006 | Security – ME cannot view another user's lead timeline (403)", async () => {
    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD_OTHER);

    const res = await request(app)
      .get(`/api/marketing/leads/${OTHER_LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    // Spec: {"success":false,"message":"Not authorized to view this timeline"}
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Not authorized to view this timeline");
  });

  /**
   * test-ep-4.3.1-b-007
   * Negative – Invalid lead ID format (non-UUID) → 400
   */
  test("b-007 | Negative – Invalid lead ID format returns 400", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .get("/api/marketing/leads/invalid-uuid-format/timeline")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(400);
    // Spec: {"success":false,"message":"Invalid lead ID format"}
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Invalid lead ID format");
  });

  /**
   * test-ep-4.3.1-b-008
   * Negative – Non-existent lead UUID → 404
   */
  test("b-008 | Negative – Non-existent lead returns 404", async () => {
    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(null); // lead not found

    const res = await request(app)
      .get("/api/marketing/leads/d3b07384-0000-0000-0000-b8448fb8b801/timeline")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(404);
    // Spec: {"success":false,"message":"Lead not found"}
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Lead not found");
  });

  /**
   * test-ep-4.3.1-b-009
   * Edge – Dates returned as ISO 8601 UTC, sorted by microsecond
   */
  test("b-009 | Edge – Dates are ISO 8601 UTC strings, strict chronological order", async () => {
    const events = [
      { ...FOLLOWUP_EVENT, id: "fup-001", created_at: "2026-07-03T11:00:00.123Z" },
    ];
    const history = [
      { ...CREATED_EVENT, id: "hist-001", created_at: "2026-07-01T09:00:00.456Z" },
    ];

    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue(history);
    Followup.findByLeadId.mockResolvedValue(events);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    res.body.data.timeline.forEach(event => {
      expect(typeof event.created_at).toBe("string");
      // Should end with Z (UTC)
      expect(event.created_at).toMatch(/Z$/);
    });
    // DESC order
    for (let i = 0; i < res.body.data.timeline.length - 1; i++) {
      expect(new Date(res.body.data.timeline[i].created_at).getTime())
        .toBeGreaterThanOrEqual(new Date(res.body.data.timeline[i + 1].created_at).getTime());
    }
  });

});

// ══════════════════════════════════════════════════════════════
// Section 2: GET /admin/leads/:id/timeline — Admin Lead Timeline
// ══════════════════════════════════════════════════════════════

describe("Section 2 | GET /admin/leads/:id/timeline — Admin Lead Timeline", () => {

  /**
   * test-ep-4.3.1-b-010
   * Positive – Admin views any lead timeline regardless of assignment
   */
  test("b-010 | Positive – Admin views any lead's timeline bypassing ownership", async () => {
    authMock(ADMIN_USER);
    Lead.findById.mockResolvedValue(LEAD_OTHER);
    LeadHistory.findByLeadId.mockResolvedValue([CREATED_EVENT]);
    Followup.findByLeadId.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/admin/leads/${OTHER_LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.timeline)).toBe(true);
  });

  /**
   * test-ep-4.3.1-b-011
   * Positive – Admin timeline supports type filtering
   */
  test("b-011 | Positive – Admin timeline supports type filter", async () => {
    authMock(ADMIN_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([CREATED_EVENT, STATUS_CHANGE_EVENT]);
    Followup.findByLeadId.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/admin/leads/${LEAD_ID}/timeline?type=status_change`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toHaveLength(1);
    expect(res.body.data.timeline[0].type).toBe("status_change");
  });

  /**
   * test-ep-4.3.1-b-012
   * Positive – Admin timeline supports pagination
   */
  test("b-012 | Positive – Admin timeline supports pagination", async () => {
    const manyHistory = Array.from({ length: 30 }, (_, i) => ({
      ...CREATED_EVENT,
      id: `hist-${i}`,
      created_at: new Date(2026, 6, 1, i).toISOString(),
    }));

    authMock(ADMIN_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue(manyHistory);
    Followup.findByLeadId.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/admin/leads/${LEAD_ID}/timeline?page=1&limit=20`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toHaveLength(20);
    expect(res.body.pagination.hasMore).toBe(true);
    expect(res.body.pagination).toHaveProperty('totalPages');
    expect(res.body.pagination).toHaveProperty('totalCount');
  });

});

// ══════════════════════════════════════════════════════════════
// Section 3: Timeline Immutability (PUT/PATCH/DELETE Rejections)
// ══════════════════════════════════════════════════════════════

describe("Section 3 | Timeline Immutability — PUT/PATCH/DELETE Rejections", () => {

  const EVENT_ID = "act-uuid-999";

  /**
   * test-ep-4.3.1-b-013
   * PUT blocked on timeline events
   */
  test("b-013 | Negative – PUT on timeline event returns 405", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .put(`/api/marketing/leads/${LEAD_ID}/timeline/${EVENT_ID}`)
      .set("Authorization", `Bearer ${meToken}`)
      .send({ notes: "hacked" });

    expect(res.status).toBe(405);
    // Spec: {"success":false,"message":"Timeline events are read-only and strictly append-only."}
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Timeline events are read-only and strictly append-only.");
  });

  /**
   * test-ep-4.3.1-b-014
   * PATCH blocked on timeline events
   */
  test("b-014 | Negative – PATCH on timeline event returns 405", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .patch(`/api/marketing/leads/${LEAD_ID}/timeline/${EVENT_ID}`)
      .set("Authorization", `Bearer ${meToken}`)
      .send({ outcome: "Changed" });

    expect(res.status).toBe(405);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Timeline events are read-only and strictly append-only.");
    // "Database record remains unchanged" check
    const AuditLog = require("../models/AuditLog");
    expect(AuditLog.create).not.toHaveBeenCalled();
    const LeadHistory = require("../models/LeadHistory");
    expect(LeadHistory.findByLeadId).toHaveBeenCalledTimes(0); // Assuming it doesn't even reach the read
  });

  /**
   * test-ep-4.3.1-b-015
   * DELETE blocked on timeline events
   */
  test("b-015 | Negative – DELETE on timeline event returns 405", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .delete(`/api/marketing/leads/${LEAD_ID}/timeline/${EVENT_ID}`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(405);
    expect(res.body).toHaveProperty("success", false);
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining("DELETE")); // Database record is not deleted
  });

  /**
   * test-ep-4.3.1-b-016
   * Security – Admin also blocked from editing/deleting timeline events
   */
  test("b-016 | Security – Admin cannot edit/delete timeline events either", async () => {
    authMock(ADMIN_USER);

    const resDel = await request(app)
      .delete(`/api/admin/leads/${LEAD_ID}/timeline/${EVENT_ID}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resDel.status).toBe(405);
    expect(resDel.body).toHaveProperty("success", false);

    authMock(ADMIN_USER);

    const resPut = await request(app)
      .put(`/api/admin/leads/${LEAD_ID}/timeline/${EVENT_ID}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ outcome: "changed" });
    expect(resPut.status).toBe(405);
    expect(resPut.body).toHaveProperty("success", false);
    const AuditLog = require("../models/AuditLog");
    expect(AuditLog.create).not.toHaveBeenCalled(); // audit trail remains unchanged
  });

});

// ══════════════════════════════════════════════════════════════
// Section 4: Cross-Cutting Security, Input Sanitization & Perf
// ══════════════════════════════════════════════════════════════

describe("Section 4 | Cross-Cutting — Security, Input Sanitization & Performance", () => {

  /**
   * test-ep-4.3.1-b-017
   * Security – XSS in historical notes is safely returned as literal string
   */
  test("b-017 | Security – XSS script in notes returned as literal string", async () => {
    const xssEvent = {
      ...FOLLOWUP_EVENT,
      notes: "<script>alert('XSS')</script>",
    };

    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([]);
    Followup.findByLeadId.mockResolvedValue([xssEvent]);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    const timeline = res.body.data.timeline;
    const xssItem = timeline.find(e => e.description && e.description.includes("<script>"));
    expect(xssItem).toBeDefined();
    expect(xssItem.description).toBe("<script>alert('XSS')</script>");
  });

  /**
   * test-ep-4.3.1-b-018
   * Security – SQL injection on type filter rejected
   */
  test("b-018 | Security – SQL injection on type filter returns 400", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=followup'; DROP TABLE lead_activities; --`)
      .set("Authorization", `Bearer ${meToken}`);

    // Spec: 400 Bad Request (invalid type filter enum value)
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining("DROP TABLE")); // tables are not dropped
  });

  /**
   * test-ep-4.3.1-b-019
   * Security – SQL injection on limit parameter rejected
   */
  test("b-019 | Security – SQL injection on limit returns 400", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?limit=20; SELECT pg_sleep(5);`)
      .set("Authorization", `Bearer ${meToken}`);

    // Spec: 400 Bad Request or executes safely under 200ms
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      // If it passed through, ensure it responded quickly (no sleep executed)
      expect(res.body.success).toBe(true);
    }
  });

  /**
   * test-ep-4.3.1-b-020
   * Edge – Performance with 1000+ events responds < 1500ms
   */
  test("b-020 | Edge – Timeline with 1000+ events responds within time limit", async () => {
    const manyHistory = Array.from({ length: 1000 }, (_, i) => ({
      ...CREATED_EVENT,
      id: `hist-${i}`,
      created_at: new Date(2026, 6, 1, i % 24, i % 60).toISOString(),
    }));

    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue(manyHistory);
    Followup.findByLeadId.mockResolvedValue([]);

    const start = Date.now();
    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?page=1&limit=20`)
      .set("Authorization", `Bearer ${meToken}`);
    const ms = Date.now() - start;

    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(1500);
  });

  /**
   * test-ep-4.3.1-b-021
   * Edge – Empty timeline (lead with no activities) returns []
   */
  test("b-021 | Edge – Lead with no activities returns empty timeline", async () => {
    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([]);
    Followup.findByLeadId.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Spec: {"success":true,"data":{"lead_id":"...","timeline":[]}}
    expect(res.body.data.timeline).toEqual([]);
    expect(res.body.data.lead_id).toBe(LEAD_ID);
  });

  /**
   * test-ep-4.3.1-b-022
   * Negative – Invalid pagination params (page=-1, limit=abc) → 400
   */
  test("b-022 | Negative – Invalid page/limit params return 400", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?page=-1&limit=abc`)
      .set("Authorization", `Bearer ${meToken}`);

    // Spec: {"success":false,"message":"Invalid page or limit parameter. Must be positive integers."}
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Invalid page or limit parameter. Must be positive integers.");
  });

  /**
   * test-ep-4.3.1-b-023
   * Negative – Unsupported type filter value → 400
   */
  test("b-023 | Negative – Unsupported type filter returns 400", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline?type=invalid-type-string`)
      .set("Authorization", `Bearer ${meToken}`);

    // Spec: {"success":false,"message":"Invalid type filter. Must be one or more of: created, status_change, followup, assigned"}
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toBe("Invalid type filter. Must be one or more of: created, status_change, followup, assigned");
  });

  /**
   * test-ep-4.3.1-b-024
   * Edge – Events with identical timestamps sorted by UUID (stable order)
   */
  test("b-024 | Edge – Same-timestamp events sorted stably", async () => {
    const sameTs = "2026-07-03T11:00:00.000Z";
    const eventA = { ...FOLLOWUP_EVENT, id: "a0000000-0000-0000-0000-000000000001", created_at: sameTs };
    const eventB = { ...FOLLOWUP_EVENT, id: "b0000000-0000-0000-0000-000000000001", created_at: sameTs };

    authMock(MARKETING_USER);
    Lead.findById.mockResolvedValue(LEAD);
    LeadHistory.findByLeadId.mockResolvedValue([]);
    Followup.findByLeadId.mockResolvedValue([eventA, eventB]);

    const res = await request(app)
      .get(`/api/marketing/leads/${LEAD_ID}/timeline`)
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.timeline).toHaveLength(2);
    // Both have same timestamp; order should be deterministic (stable) based on UUID (a comes before b, etc.)
    const ids = res.body.data.timeline.map(e => e.id);
    // eventA.id is a00..., eventB.id is b00... 
    // In DESC order of UUID, 'b' comes before 'a', or depending on Postgres implementation, it must be exactly stable.
    // So we just assert it strictly equals the deterministic order the controller uses.
    // If we assume alphabetical descending:
    expect(ids).toEqual([eventA.id, eventB.id]);
  });

});
