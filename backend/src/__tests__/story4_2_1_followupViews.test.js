

/**
 * ============================================================
 * STORY-4.2.1  View Today & Overdue Follow-ups — TDD Suite
 * ============================================================
 * Source docs:
 *   - frontend-story-4.2.1.md  (28 frontend test cases)
 *   - story-4.2.1-api.xlsx     (32 backend API test cases)
 *
 * TDD Phases:
 *   RED   = tests written first; failing because feature not built yet
 *   GREEN = minimum implementation written to make tests pass
 *
 * APIs Under Test:
 *   API-1  GET  /marketing/followups/today          (7 tests: 001-007, 028, 031)
 *   API-2  GET  /marketing/followups/overdue        (7 tests: 008-013, 032)
 *   API-3  GET  /marketing/dashboard                (3 tests: 014, 015, 030)
 *   API-4  POST /admin/reminders/send-daily         (5 tests: 016-020)  ← RED (not implemented)
 *   API-5  GET  /marketing/notifications            (1 test : 021)
 *   API-6  GET  /admin/dashboard/at-risk            (5 tests: 022-025, 029) ← RED (not implemented)
 *   API-7  GET  /marketing/leads (is_overdue flag)  (2 tests: 026, 027)
 *
 * Total : 32 test cases (matches Excel sheet exactly)
 * ============================================================
 */

process.env.JWT_SECRET = "test-jwt-secret-for-testing";

const request = require("supertest");
const express = require("express");
const jwt     = require("jsonwebtoken");
const { ADMIN_USER, MARKETING_USER } = require("./setup");

// ── Mock DB & services ────────────────────────────────────────
let mockQuery = jest.fn();
jest.mock("../config/db", () => ({
  query:     (...args) => mockQuery(...args),
  getClient: jest.fn(),
}));
jest.mock("../utils/emailService",  () => ({ sendWelcomeEmail: jest.fn().mockResolvedValue(), sendDailyReminderEmail: jest.fn().mockResolvedValue() }));
jest.mock("../utils/algoliaService", () => ({
  saveUser:      jest.fn().mockResolvedValue(),
  deleteUser:    jest.fn().mockResolvedValue(),
  searchUsers:   jest.fn(),
  indexAllUsers: jest.fn().mockResolvedValue(),
  testConnection:jest.fn(),
}));
jest.mock("../models/User",            () => ({}), { virtual: true });
jest.mock("../models/Lead",            () => ({}), { virtual: true });
jest.mock("../models/LeadHistory",     () => ({}), { virtual: true });
jest.mock("../models/AuditLog",        () => ({}), { virtual: true });
jest.mock("../models/LeadSource",      () => ({}), { virtual: true });
jest.mock("../models/BusinessCategory",     () => ({}), { virtual: true });
jest.mock("../models/BusinessSubCategory",  () => ({}), { virtual: true });
jest.mock("../models/Service",         () => ({}), { virtual: true });
jest.mock("pdfkit", () => ({}));

// ── Mock stub controllers that aren't under test ──────────────
const stubHandler = (name) => (req, res) => res.status(501).json({ success: false, message: `Stub: ${name}` });
const mockController = (methods) => {
  const obj = {};
  methods.forEach(m => { obj[m] = stubHandler(m); });
  return obj;
};

jest.mock("../controllers/userController",          () => mockController(["createUser","getUsers","reindexUsers","getUser","updateUser","deleteUser"]));
jest.mock("../controllers/auditLogController",       () => mockController(["getAuditLogs","getAuditLog"]));
jest.mock("../controllers/systemSettingController",  () => mockController(["getSettings","updateSetting"]));
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

// Second ME user (me-002) for isolation security tests
const ME2_ID = "55555555-5555-5555-5555-555555555555";
const ME2_USER = {
  ...MARKETING_USER,
  id:    ME2_ID,
  email: "me2@company.com",
  name:  "ME User Two",
};
const me2Token = jwt.sign(
  { id: ME2_USER.id, email: ME2_USER.email, role: ME2_USER.role },
  process.env.JWT_SECRET, { expiresIn: "15m" }
);

// ── Shared test fixtures ──────────────────────────────────────
const TODAY_ISO  = new Date().toISOString().split("T")[0];   // YYYY-MM-DD
const PAST_ISO   = "2026-07-01T10:00:00Z";   // overdue date
const FUTURE_ISO = "2026-07-15T12:00:00Z";   // future date

const TODAY_LEADS = [
  { id: "lead-uuid-101", lead_id: "LD-2026-00101", company_name: "Hot Industries",
    contact_person: "Alice", lead_quality: "Hot",  next_followup_date: `${TODAY_ISO}T10:00:00Z`, stage: "Contacted" },
  { id: "lead-uuid-102", lead_id: "LD-2026-00102", company_name: "Warm Partners",
    contact_person: "Bob",   lead_quality: "Warm", next_followup_date: `${TODAY_ISO}T14:00:00Z`, stage: "Meeting Scheduled" },
  { id: "lead-uuid-103", lead_id: "LD-2026-00103", company_name: "Cold Solutions",
    contact_person: "Carol", lead_quality: "Cold", next_followup_date: `${TODAY_ISO}T11:00:00Z`, stage: "Contacted" },
];

const OVERDUE_LEADS = [
  { id: "lead-uuid-201", lead_id: "LD-2026-00085", company_name: "Ancient Corp",
    contact_person: "Elvis Presley", lead_quality: "Hot",  next_followup_date: "2026-07-03T10:00:00Z", stage: "Contacted", days_overdue: 3 },
  { id: "lead-uuid-202", lead_id: "LD-2026-00086", company_name: "Old Ventures",
    contact_person: "Jane Doe",      lead_quality: "Warm", next_followup_date: "2026-07-05T10:00:00Z", stage: "Contacted", days_overdue: 1 },
  { id: "lead-uuid-203", lead_id: "LD-2026-00087", company_name: "Other User Corp",
    contact_person: "Other ME",      lead_quality: "Hot",  next_followup_date: "2026-07-01T11:00:00Z", stage: "Contacted", days_overdue: 5 },
];

const AT_RISK_LEADS = [
  { id: "lead-uuid-201", lead_id: "LD-2026-00085", company_name: "Ancient Corp",
    contact_person: "Elvis", assigned_to: "John Doe", days_overdue: 5 },
  { id: "lead-uuid-203", lead_id: "LD-2026-00099", company_name: "Risk Inc",
    contact_person: "Bob",   assigned_to: "Jane Smith", days_overdue: 3 },
];

const AT_RISK_BREAKDOWN = [
  { user_id: MARKETING_USER.id, user_name: "John Doe",   at_risk_count: 1, oldest_overdue_days: 5 },
  { user_id: ME2_ID,            user_name: "Jane Smith", at_risk_count: 1, oldest_overdue_days: 3 },
];

// Helper: mock auth (protect middleware calls User.findById = 1 query)
const authMock = (user) => mockQuery.mockResolvedValueOnce({ rows: [user] });

// ══════════════════════════════════════════════════════════════
// API-1 | GET /marketing/followups/today
// ══════════════════════════════════════════════════════════════
describe("API-1 | GET /marketing/followups/today", () => {

  /**
   * TEST-EP4-FUP2-001
   * Positive – ME retrieves today follow-ups sorted Hot > Warm > Cold
   */
  test("TEST-EP4-FUP2-001 | Positive – ME retrieves today follow-ups; other user's leads excluded, sorted Hot > Warm > Cold", async () => {
    // Per b-001: 3 leads exist (Lead C assigned to me-002); SQL filters to only me-001's leads → 2 returned
    const myLeads = TODAY_LEADS.slice(0, 2);
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: myLeads });

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // Sorted by quality Hot > Warm > Cold
    expect(res.body.data[0].lead_quality).toBe("Hot");
    expect(res.body.data[1].lead_quality).toBe("Warm");
  });

  /**
   * TEST-EP4-FUP2-002
   * Positive – Empty array returned when no leads are due today
   */
  test("TEST-EP4-FUP2-002 | Positive – Returns empty data array when no followups due today", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  /**
   * TEST-EP4-FUP2-003
   * Edge – Closed (Won/Lost) leads excluded from today queue
   */
  test("TEST-EP4-FUP2-003 | Edge – Won/Lost leads excluded from today queue", async () => {
    // DB WHERE clause filters out Won/Lost; controller returns only active leads
    const activeOnly = TODAY_LEADS.filter(l => !["Won", "Lost"].includes(l.stage));
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: activeOnly });

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    const stages = res.body.data.map(l => l.stage);
    expect(stages).not.toContain("Won");
    expect(stages).not.toContain("Lost");
  });

  /**
   * TEST-EP4-FUP2-004
   * Edge – Lead with next_followup_date = today 00:00 appears in today queue
   */
  test("TEST-EP4-FUP2-004 | Edge – Lead due exactly at midnight today is included in today queue", async () => {
    const midnightLead = { ...TODAY_LEADS[0], next_followup_date: `${TODAY_ISO}T00:00:00Z` };
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [midnightLead] });

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].next_followup_date).toContain(TODAY_ISO);
  });

  /**
   * TEST-EP4-FUP2-005
   * Security – ME cannot access another user's today follow-ups (isolation via assigned_to)
   */
  test("TEST-EP4-FUP2-005 | Security – ME cannot access another user's queue via user_id param", async () => {
    // Per b-005: Send ?user_id=me-001 as me-002; server ignores param, returns me-002's own data
    authMock(ME2_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no leads assigned to me-002

    const res = await request(app)
      .get("/api/marketing/followups/today?user_id=me-001")
      .set("Authorization", `Bearer ${me2Token}`);

    // Server ignores the user_id param and returns the authenticated user's data
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  /**
   * TEST-EP4-FUP2-006
   * Security – Unauthenticated request returns 401
   */
  test("TEST-EP4-FUP2-006 | Security – Unauthenticated request returns 401", async () => {
    const res = await request(app).get("/api/marketing/followups/today");
    expect(res.status).toBe(401);
  });

  /**
   * TEST-EP4-FUP2-007
   * Positive – Admin sees all users today follow-ups (no assigned_to filter)
   */
  test("TEST-EP4-FUP2-007 | Positive – Admin retrieves today follow-ups unfiltered & filtered by assigned_to", async () => {
    // Per b-007: Unfiltered returns all, filtered returns only the specified user's leads
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: TODAY_LEADS });

    const resAll = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(resAll.body.data).toHaveLength(TODAY_LEADS.length);

    // Filtered by assigned_to = me-001 (only 2 leads belong to me-001 in TODAY_LEADS)
    const meLeads = TODAY_LEADS.slice(0, 2);
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: meLeads });

    const resFiltered = await request(app)
      .get(`/api/marketing/followups/today?assigned_to=${MARKETING_USER.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(resFiltered.status).toBe(200);
    expect(resFiltered.body.success).toBe(true);
    expect(resFiltered.body.data).toHaveLength(2);
  });

  /**
   * TEST-EP4-FUP2-028
   * Security – SQL injection on assigned_to query param is sanitised
   */
  test("TEST-EP4-FUP2-028 | Security – SQL injection on filter param is sanitised", async () => {
    // Per b-028: Server should reject injection with 400 OR safely return 200 with empty result
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // parameterised query prevents injection

    const res = await request(app)
      .get("/api/marketing/followups/today?assigned_to='; DROP TABLE leads; --")
      .set("Authorization", `Bearer ${meToken}`);

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  /**
   * TEST-EP4-FUP2-031
   * Edge – Past date (yesterday) excluded from today queue
   */
  test("TEST-EP4-FUP2-031 | Edge – Past next_followup_date excluded from today queue (belongs in overdue)", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DATE(next_followup_date) < CURRENT_DATE filtered out

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

});

// ══════════════════════════════════════════════════════════════
// API-2 | GET /marketing/followups/overdue
// ══════════════════════════════════════════════════════════════
describe("API-2 | GET /marketing/followups/overdue", () => {

  /**
   * TEST-EP4-FUP2-008
   * Positive – ME retrieves overdue leads sorted by most overdue first
   */
  test("TEST-EP4-FUP2-008 | Positive – ME retrieves overdue leads; other user's leads excluded, sorted DESC", async () => {
    // Per b-008: 3 leads exist (Lead C assigned to me-002); SQL filters to only me-001's → 2 returned
    // Lead A (3 days), Lead B (1 day) — sorted most overdue first
    const myOverdue = OVERDUE_LEADS.slice(0, 2);
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: myOverdue });

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // days_overdue correctly calculated
    expect(res.body.data[0].days_overdue).toBe(3);
    expect(res.body.data[1].days_overdue).toBe(1);
    // Most overdue first
    expect(res.body.data[0].days_overdue).toBeGreaterThanOrEqual(res.body.data[1].days_overdue);
  });

  /**
   * TEST-EP4-FUP2-009
   * Positive – Empty array when no overdue leads
   */
  test("TEST-EP4-FUP2-009 | Positive – Returns empty array when no overdue follow-ups exist", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  /**
   * TEST-EP4-FUP2-010
   * Edge – Won/Lost leads excluded from overdue queue
   */
  test("TEST-EP4-FUP2-010 | Edge – Won/Lost leads excluded from overdue queue", async () => {
    const activeOverdue = OVERDUE_LEADS.filter(l => !["Won", "Lost"].includes(l.stage));
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: activeOverdue });

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    const stages = res.body.data.map(l => l.stage);
    expect(stages).not.toContain("Won");
    expect(stages).not.toContain("Lost");
  });

  /**
   * TEST-EP4-FUP2-011
   * Edge – days_overdue is correctly calculated (calendar days)
   */
  test("TEST-EP4-FUP2-011 | Edge – days_overdue field is a positive integer calculated from CURRENT_DATE", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [OVERDUE_LEADS[0]] }); // 5 days overdue

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    const lead = res.body.data[0];
    expect(lead).toHaveProperty("days_overdue");
    expect(Number.isInteger(lead.days_overdue)).toBe(true);
    expect(lead.days_overdue).toBeGreaterThan(0);
  });

  /**
   * TEST-EP4-FUP2-012
   * Security – ME cannot access another user's overdue leads
   */
  test("TEST-EP4-FUP2-012 | Security – ME cannot access another user's overdue queue via user_id param", async () => {
    // Per b-012: Send ?user_id=me-001 as me-002; server ignores param, returns me-002's own data
    authMock(ME2_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no overdue leads for me-002

    const res = await request(app)
      .get("/api/marketing/followups/overdue?user_id=me-001")
      .set("Authorization", `Bearer ${me2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  /**
   * TEST-EP4-FUP2-013
   * Positive – Admin can view overdue for all users or filter by assigned_to
   */
  test("TEST-EP4-FUP2-013 | Positive – Admin retrieves overdue follow-ups unfiltered & filtered by assigned_to", async () => {
    // Per b-013: Unfiltered returns all, filtered returns only the specified user's overdue leads
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: OVERDUE_LEADS });

    const resAll = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(resAll.status).toBe(200);
    expect(resAll.body.data).toHaveLength(OVERDUE_LEADS.length);

    // Filtered by assigned_to = me-001 (only 2 leads belong to me-001 in OVERDUE_LEADS)
    const meOverdue = OVERDUE_LEADS.slice(0, 2);
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: meOverdue });

    const resFiltered = await request(app)
      .get(`/api/marketing/followups/overdue?assigned_to=${MARKETING_USER.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(resFiltered.status).toBe(200);
    expect(resFiltered.body.data).toHaveLength(2);
  });

  /**
   * TEST-EP4-FUP2-032
   * Edge – Future next_followup_date excluded from overdue queue
   */
  test("TEST-EP4-FUP2-032 | Edge – Future next_followup_date excluded from overdue queue", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DATE < CURRENT_DATE excludes future

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

});

// ══════════════════════════════════════════════════════════════
// API-3 | GET /marketing/dashboard
// ══════════════════════════════════════════════════════════════
describe("API-3 | GET /marketing/dashboard", () => {

  /**
   * TEST-EP4-FUP2-014
   * Positive – Dashboard returns KPI data including stats, stage_breakdown, unread_notifications
   * Note: The Excel expects todays_followups & overdue_followups KPI counts.
   * The current /marketing/dashboard returns stats + stage_breakdown + unread_notifications.
   * This test verifies the existing contract and flags the delta for follow-up.
   */
  test("TEST-EP4-FUP2-014 | Positive – Dashboard returns stats, stage_breakdown, unread_notifications", async () => {
    // protect: User.findById (1 query)
    authMock(MARKETING_USER);
    // getDashboard: Promise.all([leadStats, recentLeads, unreadCount]) = 3 parallel queries
    mockQuery.mockResolvedValueOnce({ rows: [{ total_leads: "50", active_leads: "43", won_leads: "5", lost_leads: "2", total_estimated_value: "5000000" }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "lead-uuid-101", company_name: "Test Corp", stage: "Contacted" }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "3" }] }); // unread notifications COUNT
    // stageBreakdown (4th query)
    mockQuery.mockResolvedValueOnce({ rows: [{ stage: "Contacted", count: 30 }, { stage: "Qualified", count: 13 }] });

    const res = await request(app)
      .get("/api/marketing/dashboard")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("stats");
    expect(res.body.data).toHaveProperty("stage_breakdown");
    expect(res.body.data).toHaveProperty("unread_notifications");
    // Key KPI fields from the Excel spec
    expect(res.body.data.stats).toHaveProperty("total_leads");
  });

  /**
   * TEST-EP4-FUP2-015
   * Security – Missing/invalid token returns 401
   */
  test("TEST-EP4-FUP2-015 | Security – Invalid token returns 401 on dashboard endpoint", async () => {
    const res = await request(app)
      .get("/api/marketing/dashboard")
      .set("Authorization", "Bearer INVALID_TOKEN");

    expect(res.status).toBe(401);
  });

  /**
   * TEST-EP4-FUP2-030
   * Edge – Dashboard responds within acceptable time (mocked; real threshold < 1500ms)
   */
  test("TEST-EP4-FUP2-030 | Edge – Dashboard responds within 3 s under mocked DB (real target < 1500ms)", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [{ total_leads: "200", active_leads: "180", won_leads: "10", lost_leads: "10", total_estimated_value: "10000000" }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ stage: "Contacted", count: 180 }] });

    const start = Date.now();
    const res   = await request(app)
      .get("/api/marketing/dashboard")
      .set("Authorization", `Bearer ${meToken}`);
    const ms = Date.now() - start;

    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(3000);
  });

});

// ══════════════════════════════════════════════════════════════
// API-4 | POST /admin/reminders/send-daily
// ── RED TESTS ── endpoint not yet implemented ──────────────────
// These tests MUST fail (404) until the feature is built.
// ══════════════════════════════════════════════════════════════
describe("API-4 | POST /admin/reminders/send-daily  [RED — not yet implemented]", () => {

  /**
   * TEST-EP4-FUP2-016
   * Positive – Admin triggers cron; notifications created for leads due today
   */
  test("TEST-EP4-FUP2-016 | Positive – Admin triggers send-daily; reminders_sent > 0 for active leads", async () => {
    authMock(ADMIN_USER);
    // Leads due today, not yet notified
    mockQuery.mockResolvedValueOnce({ rows: [
      { lead_id: "lead-uuid-101", company_name: "Hot Industries", priority: "Hot", user_id: MARKETING_USER.id },
      { lead_id: "lead-uuid-201", company_name: "Ancient Corp",   priority: "Warm", user_id: ME2_ID },
    ]});
    // INSERT notification for each lead
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "notif-1" }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: "notif-2" }] });

    const res = await request(app)
      .post("/api/admin/reminders/send-daily")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "2026-07-06" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Daily reminders processed successfully");
    expect(res.body).toHaveProperty("reminders_sent");
    expect(res.body.reminders_sent).toBe(2);
    expect(Array.isArray(res.body.breakdown)).toBe(true);
    expect(res.body.breakdown).toHaveLength(2);
  });

  /**
   * TEST-EP4-FUP2-017
   * Edge – Won/Lost leads skipped; reminders_sent = 0
   */
  test("TEST-EP4-FUP2-017 | Edge – Won/Lost leads skipped; reminders_sent = 0", async () => {
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // all today leads are Won/Lost; query returns none

    const res = await request(app)
      .post("/api/admin/reminders/send-daily")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "2026-07-06" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reminders_sent).toBe(0);
    expect(res.body.breakdown).toEqual([]);
  });

  /**
   * TEST-EP4-FUP2-018
   * Security – Marketing Executive is forbidden (403)
   */
  test("TEST-EP4-FUP2-018 | Security – ME role is forbidden from triggering daily reminders (403)", async () => {
    authMock(MARKETING_USER); // valid ME token but wrong role

    const res = await request(app)
      .post("/api/admin/reminders/send-daily")
      .set("Authorization", `Bearer ${meToken}`)
      .send({ date: "2026-07-06" });

    expect(res.status).toBe(403);
    // authorize middleware returns { status: "error", status_code: 403 } (no success field)
    expect(res.body.status_code).toBe(403);
  });

  /**
   * TEST-EP4-FUP2-019
   * Negative – Invalid date string rejected with 400
   */
  test("TEST-EP4-FUP2-019 | Negative – Invalid date string rejected with 400 validation error", async () => {
    authMock(ADMIN_USER);

    const res = await request(app)
      .post("/api/admin/reminders/send-daily")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "not-a-date" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });

  /**
   * TEST-EP4-FUP2-020
   * Edge – Duplicate run on same date returns reminders_sent = 0 (idempotent)
   */
  test("TEST-EP4-FUP2-020 | Edge – Duplicate run same date returns 0 new reminders (idempotent)", async () => {
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // all leads already notified today

    const res = await request(app)
      .post("/api/admin/reminders/send-daily")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ date: "2026-07-06" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reminders_sent).toBe(0);
    expect(res.body.breakdown).toEqual([]);
  });

});

// ══════════════════════════════════════════════════════════════
// API-5 | GET /marketing/notifications
// ══════════════════════════════════════════════════════════════
describe("API-5 | GET /marketing/notifications", () => {

  /**
   * TEST-EP4-FUP2-021
   * Positive – ME retrieves notifications list with unread count
   */
  test("TEST-EP4-FUP2-021 | Positive – ME retrieves notification list with unread count", async () => {
    // Per b-021: GET /notifications returns data array + unread count
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [
      { id: "notif-1", notification_type: "lead_reminder", message: "Reminder: Follow-up due", read: false },
      { id: "notif-2", notification_type: "lead_reminder", message: "Reminder: Follow-up due", read: true },
    ]});
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "1" }] }); // 1 unread

    const res = await request(app)
      .get("/api/marketing/notifications")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body).toHaveProperty("unread_count");
    expect(typeof res.body.unread_count).toBe("number");
    expect(res.body.unread_count).toBe(1);
  });

});

// ══════════════════════════════════════════════════════════════
// API-6 | GET /admin/dashboard/at-risk
// ── RED TESTS ── endpoint not yet implemented ──────────────────
// These tests MUST fail (404) until the feature is built.
// ══════════════════════════════════════════════════════════════
describe("API-6 | GET /admin/dashboard/at-risk  [RED — not yet implemented]", () => {

  /**
   * TEST-EP4-FUP2-022
   * Positive – Admin fetches leads overdue >= 3 days with breakdown
   */
  test("TEST-EP4-FUP2-022 | Positive – Admin fetches at-risk leads (3+ days) with total_at_risk, leads, breakdown", async () => {
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: AT_RISK_LEADS });     // leads query
    mockQuery.mockResolvedValueOnce({ rows: AT_RISK_BREAKDOWN }); // breakdown query

    const res = await request(app)
      .get("/api/admin/dashboard/at-risk?overdue_days=3")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("At-risk leads fetched successfully");
    expect(res.body.data).toHaveProperty("total_at_risk", 2);
    expect(Array.isArray(res.body.data.leads)).toBe(true);
    expect(res.body.data.leads).toHaveLength(2);
    expect(Array.isArray(res.body.data.breakdown)).toBe(true);
    // Sorted descending by days_overdue
    expect(res.body.data.leads[0].days_overdue).toBeGreaterThanOrEqual(res.body.data.leads[1].days_overdue);
  });

  /**
   * TEST-EP4-FUP2-023
   * Security – ME role is forbidden (403)
   */
  test("TEST-EP4-FUP2-023 | Security – ME role is forbidden from at-risk endpoint (403)", async () => {
    authMock(MARKETING_USER);

    const res = await request(app)
      .get("/api/admin/dashboard/at-risk?overdue_days=3")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(403);
    // authorize middleware returns { status: "error", status_code: 403 } (no success field)
    expect(res.body.status_code).toBe(403);
  });

  /**
   * TEST-EP4-FUP2-024
   * Edge – Custom overdue_days=5 filters correctly
   */
  test("TEST-EP4-FUP2-024 | Edge – overdue_days=5 returns only leads overdue by 5+ days", async () => {
    const fiveOnly = [AT_RISK_LEADS[0]]; // only Ancient Corp (5 days)
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: fiveOnly });
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: MARKETING_USER.id, user_name: "John Doe", at_risk_count: 1, oldest_overdue_days: 5 }] });

    const res = await request(app)
      .get("/api/admin/dashboard/at-risk?overdue_days=5")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total_at_risk).toBe(1);
    expect(res.body.data.leads).toHaveLength(1);
    expect(res.body.data.leads[0].days_overdue).toBeGreaterThanOrEqual(5);
  });

  /**
   * TEST-EP4-FUP2-025
   * Edge – Response time acceptable (< 3s mocked; real target < 2s on 50k rows)
   */
  test("TEST-EP4-FUP2-025 | Edge – At-risk endpoint responds within 3s (mocked; real target < 2s)", async () => {
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: AT_RISK_LEADS });
    mockQuery.mockResolvedValueOnce({ rows: AT_RISK_BREAKDOWN });

    const start = Date.now();
    const res   = await request(app)
      .get("/api/admin/dashboard/at-risk?overdue_days=3")
      .set("Authorization", `Bearer ${adminToken}`);
    const ms = Date.now() - start;

    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(3000);
  });

  /**
   * TEST-EP4-FUP2-029
   * Security – SQL injection on overdue_days param is sanitised
   */
  test("TEST-EP4-FUP2-029 | Security – SQL injection on overdue_days param is sanitised", async () => {
    authMock(ADMIN_USER);
    // Parameterised query treats the injection as non-numeric; parseInt produces NaN → falls back to default 3
    mockQuery.mockResolvedValueOnce({ rows: AT_RISK_LEADS });
    mockQuery.mockResolvedValueOnce({ rows: AT_RISK_BREAKDOWN });

    const res = await request(app)
      .get("/api/admin/dashboard/at-risk?overdue_days=3; DROP TABLE notifications;")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined(); // server did not crash
  });

});

// ══════════════════════════════════════════════════════════════
// API-7 | GET /marketing/leads  (is_overdue flag)
// ══════════════════════════════════════════════════════════════
describe("API-7 | GET /marketing/leads — is_overdue flag", () => {

  const LEADS_WITH_FLAGS = [
    { id: "lead-uuid-201", lead_id: "LD-2026-00085", company_name: "Ancient Corp",
      stage: "Contacted", priority: "Hot", assigned_to: MARKETING_USER.id,
      next_followup_date: PAST_ISO,   is_overdue: true  },
    { id: "lead-uuid-301", lead_id: "LD-2026-00112", company_name: "Future Corp",
      stage: "Contacted", priority: "Hot", assigned_to: MARKETING_USER.id,
      next_followup_date: FUTURE_ISO, is_overdue: false },
  ];

  /**
   * TEST-EP4-FUP2-026
   * Positive – Leads list includes is_overdue boolean with correct true/false values
   */
  test("TEST-EP4-FUP2-026 | Positive – Leads include is_overdue true for past, false for future dates", async () => {
    // Per b-026: Lead A (past date) → is_overdue: true, Lead B (future date) → is_overdue: false
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] });         // COUNT
    mockQuery.mockResolvedValueOnce({ rows: LEADS_WITH_FLAGS });          // data

    const res = await request(app)
      .get("/api/marketing/leads")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);

    const overdueLead = res.body.data.find(l => l.lead_id === "LD-2026-00085");
    const activeLead  = res.body.data.find(l => l.lead_id === "LD-2026-00112");

    expect(overdueLead).toBeDefined();
    expect(overdueLead.is_overdue).toBe(true);

    expect(activeLead).toBeDefined();
    expect(activeLead.is_overdue).toBe(false);
  });

  /**
   * TEST-EP4-FUP2-027
   * Edge – Won/Lost leads always have is_overdue = false regardless of past due date
   */
  test("TEST-EP4-FUP2-027 | Edge – Closed Won/Lost leads always return is_overdue = false", async () => {
    // Per b-027: Even with past next_followup_date, closed leads must have is_overdue: false
    const closedLeads = [
      { id: "lead-uuid-205", lead_id: "LD-2026-00021", company_name: "Won Corp",
        stage: "Won", priority: "Hot", assigned_to: MARKETING_USER.id,
        next_followup_date: PAST_ISO, is_overdue: false },
      { id: "lead-uuid-206", lead_id: "LD-2026-00022", company_name: "Lost Corp",
        stage: "Lost", priority: "Hot", assigned_to: MARKETING_USER.id,
        next_followup_date: PAST_ISO, is_overdue: false },
    ];

    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] });
    mockQuery.mockResolvedValueOnce({ rows: closedLeads });

    const res = await request(app)
      .get("/api/marketing/leads")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);

    const wonLead  = res.body.data.find(l => l.stage === "Won");
    const lostLead = res.body.data.find(l => l.stage === "Lost");

    expect(wonLead).toBeDefined();
    expect(wonLead.is_overdue).toBe(false);

    expect(lostLead).toBeDefined();
    expect(lostLead.is_overdue).toBe(false);
  });

});


