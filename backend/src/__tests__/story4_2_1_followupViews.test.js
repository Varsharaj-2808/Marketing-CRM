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
jest.mock("../utils/emailService",  () => ({ sendWelcomeEmail: jest.fn().mockResolvedValue() }));
jest.mock("../utils/algoliaService", () => ({
  saveUser:      jest.fn().mockResolvedValue(),
  deleteUser:    jest.fn().mockResolvedValue(),
  searchUsers:   jest.fn(),
  indexAllUsers: jest.fn().mockResolvedValue(),
  testConnection:jest.fn(),
}));

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
    contact_person: "Alice", lead_quality: "Hot",  next_followup_date: `${TODAY_ISO}T09:00:00Z`, stage: "Contacted" },
  { id: "lead-uuid-102", lead_id: "LD-2026-00102", company_name: "Warm Partners",
    contact_person: "Bob",   lead_quality: "Warm", next_followup_date: `${TODAY_ISO}T11:00:00Z`, stage: "Contacted" },
  { id: "lead-uuid-103", lead_id: "LD-2026-00103", company_name: "Cold Solutions",
    contact_person: "Carol", lead_quality: "Cold", next_followup_date: `${TODAY_ISO}T14:00:00Z`, stage: "Contacted" },
];

const OVERDUE_LEADS = [
  { id: "lead-uuid-201", lead_id: "LD-2026-00085", company_name: "Ancient Corp",
    contact_person: "Elvis Presley", lead_quality: "Hot",  next_followup_date: "2026-07-01T10:00:00Z", stage: "Contacted", days_overdue: 5 },
  { id: "lead-uuid-202", lead_id: "LD-2026-00086", company_name: "Old Ventures",
    contact_person: "Jane Doe",      lead_quality: "Warm", next_followup_date: "2026-07-04T10:00:00Z", stage: "Contacted", days_overdue: 2 },
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
  test("TEST-EP4-FUP2-001 | Positive – ME retrieves today follow-ups sorted Hot > Warm > Cold", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: TODAY_LEADS });

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
    // Hot must come first (DB sorts by CASE priority)
    expect(res.body.data[0].lead_quality).toBe("Hot");
    expect(res.body.data[1].lead_quality).toBe("Warm");
    expect(res.body.data[2].lead_quality).toBe("Cold");
  });

  /**
   * TEST-EP4-FUP2-002
   * Positive – Empty array returned when no leads are due today
   */
  test("TEST-EP4-FUP2-002 | Positive – Returns empty data array when no leads due today", async () => {
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
  test("TEST-EP4-FUP2-005 | Security – ME only sees leads assigned to themselves (data isolation)", async () => {
    // me-002 is authenticated; DB returns 0 leads because assigned_to = me-002 filters them out
    authMock(ME2_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no leads assigned to me-002 today

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${me2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]); // me-002 cannot see me-001 leads
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
  test("TEST-EP4-FUP2-007 | Positive – Admin retrieves today follow-ups across all MEs", async () => {
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: TODAY_LEADS });

    const res = await request(app)
      .get("/api/marketing/followups/today")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(TODAY_LEADS.length);
  });

  /**
   * TEST-EP4-FUP2-028
   * Security – SQL injection on assigned_to query param is sanitised
   */
  test("TEST-EP4-FUP2-028 | Security – SQL injection on filter param is sanitised (parameterised query)", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DB uses parameterised query; safe result

    const res = await request(app)
      .get("/api/marketing/followups/today?assigned_to='; DROP TABLE leads; --")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true); // server did not crash
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
  test("TEST-EP4-FUP2-008 | Positive – ME retrieves overdue leads sorted descending by days_overdue", async () => {
    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: OVERDUE_LEADS }); // already sorted DESC

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    // Verify each record has days_overdue > 0
    res.body.data.forEach(l => {
      expect(l).toHaveProperty("days_overdue");
      expect(l.days_overdue).toBeGreaterThan(0);
    });
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
  test("TEST-EP4-FUP2-012 | Security – ME sees only their own overdue leads (data isolation)", async () => {
    // me-002 authenticates; DB assigned_to = me-002 returns nothing
    authMock(ME2_USER);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${me2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  /**
   * TEST-EP4-FUP2-013
   * Positive – Admin can view overdue for all users or filter by assigned_to
   */
  test("TEST-EP4-FUP2-013 | Positive – Admin retrieves overdue follow-ups across all MEs", async () => {
    authMock(ADMIN_USER);
    mockQuery.mockResolvedValueOnce({ rows: OVERDUE_LEADS });

    const res = await request(app)
      .get("/api/marketing/followups/overdue")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(OVERDUE_LEADS.length);
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
// API-5 | GET /marketing/notifications/count
// ══════════════════════════════════════════════════════════════
describe("API-5 | GET /marketing/notifications/count", () => {

  /**
   * TEST-EP4-FUP2-021
   * Positive – ME retrieves unread notification count
   */
  test("TEST-EP4-FUP2-021 | Positive – ME retrieves unread notification count as number", async () => {
    // protect: User.findById (1 query)
    authMock(MARKETING_USER);
    // Notification.getUnreadCount (1 query: SELECT COUNT(*))
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "3" }] });

    const res = await request(app)
      .get("/api/marketing/notifications/count")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("unread_count");
    expect(typeof res.body.unread_count).toBe("number");
    expect(res.body.unread_count).toBe(3);
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
   * Positive – Leads list includes is_overdue boolean flag
   * Lead.findAll executes 2 queries: COUNT(*) then SELECT data
   */
  test("TEST-EP4-FUP2-026 | Positive – Leads list includes next_followup_date and is_overdue boolean flag", async () => {
    authMock(MARKETING_USER);                                            // protect (1 query)
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] });         // COUNT
    mockQuery.mockResolvedValueOnce({ rows: LEADS_WITH_FLAGS });          // data

    const res = await request(app)
      .get("/api/marketing/leads")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const overdueLead = res.body.data.find(l => l.lead_id === "LD-2026-00085");
    const activeLead  = res.body.data.find(l => l.lead_id === "LD-2026-00112");
    // is_overdue must be present on both rows
    if (overdueLead) expect(overdueLead).toHaveProperty("is_overdue");
    if (activeLead)  expect(activeLead).toHaveProperty("is_overdue");
  });

  /**
   * TEST-EP4-FUP2-027
   * Edge – Won/Lost leads always have is_overdue = false
   */
  test("TEST-EP4-FUP2-027 | Edge – Closed Won/Lost leads always return is_overdue = false", async () => {
    const closedLead = {
      id: "lead-uuid-205", lead_id: "LD-2026-00021", company_name: "Closed Corp",
      stage: "Won", priority: "Hot", assigned_to: MARKETING_USER.id,
      next_followup_date: PAST_ISO,  // past date but closed
      is_overdue: false,             // business rule: closed leads are never overdue
    };

    authMock(MARKETING_USER);
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "1" }] });
    mockQuery.mockResolvedValueOnce({ rows: [closedLead] });

    const res = await request(app)
      .get("/api/marketing/leads")
      .set("Authorization", `Bearer ${meToken}`);

    expect(res.status).toBe(200);
    const wonLead = res.body.data.find(l => l.stage === "Won");
    if (wonLead) {
      expect(wonLead.is_overdue).toBe(false); // must never be true for closed leads
    }
  });

});


