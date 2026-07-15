# EPIC-6: Analytics & Export — Backend API Test Cases

> **Epic Goal:** Provide real-time dashboard metrics, follow-up management, calendar scheduling, and data export capabilities for actionable insights.
> **Stories:**
> - **STORY-6.1.1:** Admin Dashboard — Aggregate KPIs, category volume, win-rate-by-source charts, and at-risk lead monitoring.
> - **STORY-6.2.1:** Marketing Executive Dashboard — Personal KPIs, conversion rate, today's follow-ups, and server-side access controls.
> - **STORY-6.3.1:** Export Lead Data — CSV/Excel export with exact filter enforcement, audit logging, and RBAC.
> **Tech Stack:** Node.js / Express.js / PostgreSQL (Supabase) / JWT Authentication / RBAC / Vitest
> **Total Test Cases:** 54

---

## Acceptance Criteria

### STORY-6.1.1 — Admin Dashboard
1. **Role-Based Access**: All `/admin/dashboard/*` endpoints must reject Marketing Executive tokens with HTTP 403.
2. **Date-Range Filtering**: All chart endpoints accept `?from=YYYY-MM-DD&to=YYYY-MM-DD`; invalid formats return 400.
3. **Performance**: KPI endpoint must respond in <2s for 50K+ leads; response includes cache metadata.
4. **At-Risk Monitoring**: At-risk endpoint supports `?overdue_days=N` and groups by assigned user.
5. **Empty States**: Graph endpoints return `"data": []` when no records match the filter.

### STORY-6.2.1 — Marketing Executive Dashboard
1. **Server-Side Scoping**: All `/marketing/dashboard/*` endpoints scope data to `req.user.id` (from JWT); any client-supplied `assigned_to` param is ignored.
2. **Role Restriction**: Marketing Executive endpoints return 403 for Admin tokens and vice versa.
3. **Conversion Rate Protection**: Zero Won/Lost leads returns 0% without divide-by-zero error.
4. **Follow-ups Today**: Returns leads with `next_followup_date = today`, sorted by `lead_quality` (Hot > Warm > Cold), paginated.
5. **Lead Access Control**: `GET /marketing/leads/:id` returns 403 if lead is not assigned to the requesting user.

### STORY-6.3.1 — Export Lead Data
1. **Admin-Only Export**: All export endpoints are restricted to Admin role (HTTP 403 for Marketing Executive).
2. **Exact Filter Enforcement**: Export re-runs the same filters as the Lead List; row count must match exactly (`X-Record-Count` header).
3. **Audit Trail**: Every export creates an `audit_logs` entry with actor, record_count, format, and applied filters.
4. **Format Validation**: Only `csv` and `excel` formats accepted; anything else returns 400.
5. **Zero-Record Export**: Filters matching zero leads still produce a valid file (headers only) with `X-Record-Count: 0`.

---

## Table of Contents

### Part 1: STORY-6.1.1 — Admin Dashboard
1. [GET /admin/dashboard/kpis](#1-get-admindashboardkpis)
2. [GET /admin/dashboard/category-volume](#2-get-admindashboardcategory-volume)
3. [GET /admin/dashboard/won-rate-by-source](#3-get-admindashboardwon-rate-by-source)
4. [GET /admin/dashboard/at-risk](#4-get-admindashboardat-risk)

### Part 2: STORY-6.2.1 — Marketing Executive Dashboard
5. [GET /marketing/dashboard](#5-get-marketingdashboard)
6. [GET /marketing/dashboard/cards](#6-get-marketingdashboardcards)
7. [GET /marketing/dashboard/conversion-rate](#7-get-marketingdashboardconversion-rate)
8. [GET /marketing/followups/today](#8-get-marketingfollowupstoday)

### Part 3: STORY-6.3.1 — Export Lead Data
9. [GET /admin/leads/export](#9-get-adminleadsexport)
10. [GET /admin/audit-log (Export Verification)](#10-get-adminaudit-log-export-verification)

---

## Part 1: STORY-6.1.1 — Admin Dashboard

## 1. GET /admin/dashboard/kpis

### test-ep-6.1.1-b-001
**Category:** GET /admin/dashboard/kpis

**Description:** Verify that an Admin can fetch aggregate KPI data. Response returns total_leads, status-wise counts, today_followups, lead quality counts, and conversion_rate.

**Preconditions:**
1. User logged in as Admin `admin-001`.
2. System has 150 leads with varying statuses, sources, and qualities.

**Input / Steps:**
1. Send `GET /admin/dashboard/kpis` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "total_leads": 150,
    "new": 30,
    "today_followups": 12,
    "contacted": 40,
    "qualified": 25,
    "meeting": 20,
    "proposal": 15,
    "negotiation": 10,
    "won": 8,
    "lost": 2,
    "conversion_rate": "5.33%",
    "hot_leads": 50,
    "warm_leads": 70,
    "cold_leads": 30
  }
}
```
3. All numeric fields are non-negative integers (or string for conversion_rate).
4. `conversion_rate` is a string ending with `%`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-002
**Category:** GET /admin/dashboard/kpis

**Description:** Verify that date-range query parameters filter KPIs to the specified timeframe.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Leads exist both inside and outside the range `2026-01-01` to `2026-06-30`.

**Input / Steps:**
1. Send `GET /admin/dashboard/kpis?from=2026-01-01&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "total_leads": 100,
    "new": 20,
    "today_followups": 8,
    "contacted": 25,
    "qualified": 18,
    "won": 6,
    "lost": 1,
    "conversion_rate": "6%"
  }
}
```
3. Values reflect leads with `created_at` within the date range only.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-003
**Category:** GET /admin/dashboard/kpis

**Description:** Verify 400 when date parameters are not in valid YYYY-MM-DD format.

**Preconditions:**
1. Admin `admin-001` logged in.

**Input / Steps:**
1. Send `GET /admin/dashboard/kpis?from=invalid&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response: `{ "success": false, "message": "Invalid date format. Use YYYY-MM-DD" }`.

**Priority:** Medium | **Type:** Negative | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-004
**Category:** GET /admin/dashboard/kpis

**Description:** Verify KPI endpoint handles large datasets (50K leads) within 2 seconds and includes cache metadata.

**Preconditions:**
1. Admin `admin-001` logged in.
2. System has 50,000+ leads with varied statuses and qualities.

**Input / Steps:**
1. Send `GET /admin/dashboard/kpis?from=2026-01-01&to=2026-06-26` with Admin token.

**Expected Result:**
1. HTTP 200 OK within 2 seconds.
2. Response body:
```json
{
  "success": true,
  "data": {
    "total_leads": 50000,
    "new": 8000,
    "today_followups": 420,
    "contacted": 12000,
    "qualified": 9000,
    "meeting": 7000,
    "proposal": 6000,
    "negotiation": 4000,
    "won": 3000,
    "lost": 1000,
    "hold": 500,
    "at_risk_count": 220,
    "conversion_rate": "6%",
    "hot_leads": 15000,
    "warm_leads": 22000,
    "cold_leads": 13000
  },
  "meta": {
    "generated_at": "2026-06-26T10:00:00Z",
    "cache_ttl_seconds": 60
  }
}
```
3. `meta` object is present with `generated_at` (ISO 8601) and `cache_ttl_seconds`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-005
**Category:** GET /admin/dashboard/kpis

**Description:** Verify 403 when a Marketing Executive attempts to access the admin KPI endpoint.

**Preconditions:**
1. User logged in as ME `me-001`.

**Input / Steps:**
1. Send `GET /admin/dashboard/kpis` with ME Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "Access denied. Admin role required." }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-006
**Category:** GET /admin/dashboard/kpis

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /admin/dashboard/kpis` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.1.1

---

## 2. GET /admin/dashboard/category-volume

### test-ep-6.1.1-b-007
**Category:** GET /admin/dashboard/category-volume

**Description:** Verify that category-volume groups leads by category and sub_category within a date range.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Leads exist across 6 categories with multiple sub_categories.

**Input / Steps:**
1. Send `GET /admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": [
    { "category": "Software Solutions", "sub_category": "CRM", "lead_count": 4200 },
    { "category": "Software Solutions", "sub_category": "ERP", "lead_count": 2600 },
    { "category": "Digital Marketing", "sub_category": "SEO", "lead_count": 1800 }
  ],
  "meta": {
    "total_categories": 6,
    "cache_ttl_seconds": 60
  }
}
```
3. Each object has `category`, `sub_category`, and `lead_count`.
4. Results are sorted by `lead_count` descending.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-008
**Category:** GET /admin/dashboard/category-volume

**Description:** Verify filtering by `category_id` returns only sub_categories within that parent category.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Category `Software Solutions` has UUID `64f1a2b3c4d5e6f7a8b9c0d1` with two sub_categories.

**Input / Steps:**
1. Send `GET /admin/dashboard/category-volume?category_id=64f1a2b3c4d5e6f7a8b9c0d1&from=2026-01-01&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": [
    { "category": "Software Solutions", "sub_category": "CRM", "lead_count": 4200 },
    { "category": "Software Solutions", "sub_category": "ERP", "lead_count": 2600 }
  ]
}
```
3. Only entries matching the specified category are returned.

**Priority:** Medium | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-009
**Category:** GET /admin/dashboard/category-volume

**Description:** Verify 400 when date parameters are invalid.

**Preconditions:**
1. Admin `admin-001` logged in.

**Input / Steps:**
1. Send `GET /admin/dashboard/category-volume?from=invalid&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response: `{ "success": false, "message": "Invalid date format. Use YYYY-MM-DD" }`.

**Priority:** Medium | **Type:** Negative | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-010
**Category:** GET /admin/dashboard/category-volume

**Description:** Verify empty data response when no leads match the date range.

**Preconditions:**
1. Admin `admin-001` logged in.
2. No leads exist in January 2020.

**Input / Steps:**
1. Send `GET /admin/dashboard/category-volume?from=2020-01-01&to=2020-01-31` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response: `{ "success": true, "data": [] }`.

**Priority:** Low | **Type:** Edge | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-011
**Category:** GET /admin/dashboard/category-volume

**Description:** Verify 403 when a Marketing Executive attempts to access category-volume.

**Preconditions:**
1. User logged in as ME `me-001`.

**Input / Steps:**
1. Send `GET /admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30` with ME token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "Access denied. Admin role required." }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-012
**Category:** GET /admin/dashboard/category-volume

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /admin/dashboard/category-volume?from=2026-01-01&to=2026-06-30` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.1.1

---

## 3. GET /admin/dashboard/won-rate-by-source

### test-ep-6.1.1-b-013
**Category:** GET /admin/dashboard/won-rate-by-source

**Description:** Verify won-rate-by-source groups leads by `lead_source` and returns total, won, lost counts and win_rate percentage per source.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Leads exist from Website (12000 total, 900 won), Referral (6000 total, 720 won), Google Ads (9000 total, 450 won).

**Input / Steps:**
1. Send `GET /admin/dashboard/won-rate-by-source?from=2026-01-01&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": [
    { "source": "Website", "total": 12000, "won": 900, "lost": 400, "win_rate": "7.5%" },
    { "source": "Referral", "total": 6000, "won": 720, "lost": 150, "win_rate": "12%" },
    { "source": "Google Ads", "total": 9000, "won": 450, "lost": 500, "win_rate": "5%" }
  ],
  "meta": {
    "cache_ttl_seconds": 60
  }
}
```
3. `win_rate` is a string ending with `%`.
4. Results sorted by `win_rate` descending.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-014
**Category:** GET /admin/dashboard/won-rate-by-source

**Description:** Verify 400 when `from` date is later than `to` date.

**Preconditions:**
1. Admin `admin-001` logged in.

**Input / Steps:**
1. Send `GET /admin/dashboard/won-rate-by-source?from=2026-06-30&to=2026-01-01` with Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response: `{ "success": false, "message": "'from' date must be earlier than 'to' date" }`.

**Priority:** Medium | **Type:** Negative | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-015
**Category:** GET /admin/dashboard/won-rate-by-source

**Description:** Verify empty data response when no won/lost leads exist in the selected range.

**Preconditions:**
1. Admin `admin-001` logged in.
2. No leads with Won/Lost status in July 2026.

**Input / Steps:**
1. Send `GET /admin/dashboard/won-rate-by-source?from=2026-07-01&to=2026-07-05` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response: `{ "success": true, "data": [] }`.

**Priority:** Low | **Type:** Edge | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-016
**Category:** GET /admin/dashboard/won-rate-by-source

**Description:** Verify 403 when a Marketing Executive attempts to access won-rate-by-source.

**Preconditions:**
1. User logged in as ME `me-001`.

**Input / Steps:**
1. Send `GET /admin/dashboard/won-rate-by-source?from=2026-01-01&to=2026-06-30` with ME token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "Access denied. Admin role required." }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-017
**Category:** GET /admin/dashboard/won-rate-by-source

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /admin/dashboard/won-rate-by-source?from=2026-01-01&to=2026-06-30` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.1.1

---

## 4. GET /admin/dashboard/at-risk

### test-ep-6.1.1-b-018
**Category:** GET /admin/dashboard/at-risk

**Description:** Verify at-risk endpoint returns leads overdue by N+ days, grouped by assigned user, with `total_at_risk` summary.

**Preconditions:**
1. Admin `admin-001` logged in.
2. 220 leads are overdue by 3+ days, not Won/Lost, assigned across users.

**Input / Steps:**
1. Send `GET /admin/dashboard/at-risk?overdue_days=3&from=2026-01-01&to=2026-06-30` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "total_at_risk": 220,
    "breakdown": [
      { "user_id": "u1", "user_name": "Priya", "at_risk_count": 34, "oldest_overdue_days": 12 }
    ],
    "leads": [
      {
        "id": "l1",
        "lead_id": "LD-2026-00042",
        "company_name": "Acme Corp",
        "assigned_to": "Priya",
        "days_overdue": 5
      }
    ]
  }
}
```
3. `total_at_risk` matches the count of overdue leads.
4. `breakdown` groups by user with oldest overdue tracked.
5. `leads` array contains individual lead details sorted by `days_overdue` descending.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-019
**Category:** GET /admin/dashboard/at-risk

**Description:** Verify 400 when `overdue_days` is not a positive integer.

**Preconditions:**
1. Admin `admin-001` logged in.

**Input / Steps:**
1. Send `GET /admin/dashboard/at-risk?overdue_days=abc` with Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response: `{ "success": false, "message": "overdue_days must be a positive integer" }`.

**Priority:** Medium | **Type:** Negative | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-020
**Category:** GET /admin/dashboard/at-risk

**Description:** Verify empty state when no leads are at risk for the given range.

**Preconditions:**
1. Admin `admin-001` logged in.
2. No leads are overdue by 3+ days in July 2026.

**Input / Steps:**
1. Send `GET /admin/dashboard/at-risk?overdue_days=3&from=2026-07-01&to=2026-07-05` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response: `{ "success": true, "data": { "total_at_risk": 0, "breakdown": [], "leads": [] } }`.

**Priority:** Low | **Type:** Edge | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-021
**Category:** GET /admin/dashboard/at-risk

**Description:** Verify 403 when a Marketing Executive attempts to access at-risk endpoint.

**Preconditions:**
1. User logged in as ME `me-001`.

**Input / Steps:**
1. Send `GET /admin/dashboard/at-risk?overdue_days=3` with ME token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "Access denied. Admin role required." }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.1.1

---

### test-ep-6.1.1-b-022
**Category:** GET /admin/dashboard/at-risk

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /admin/dashboard/at-risk?overdue_days=3` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.1.1

---

## Part 2: STORY-6.2.1 — Marketing Executive Dashboard

## 5. GET /marketing/dashboard

### test-ep-6.2.1-b-001
**Category:** GET /marketing/dashboard

**Description:** Verify that a Marketing Executive can fetch their combined dashboard layout including cards and conversion rate, all scoped to the authenticated user.

**Preconditions:**
1. User logged in as ME `me-001` with valid JWT.
2. ME `me-001` has 50 total leads, 5 follow-ups today, 8 won, 3 lost.

**Input / Steps:**
1. Send `GET /marketing/dashboard` with ME Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "cards": {
      "my_leads": 50,
      "my_followups_today": 5,
      "my_won_leads": 8,
      "my_lost_leads": 3
    },
    "conversion_rate": {
      "won": 8,
      "lost": 3,
      "rate": "72.73%"
    }
  },
  "meta": {
    "assigned_to": "me-001-uuid",
    "generated_at": "2026-07-09T10:00:00Z"
  }
}
```
3. All data is scoped to the authenticated user from JWT.
4. `meta.assigned_to` matches the JWT user ID.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-002
**Category:** GET /marketing/dashboard

**Description:** Verify 401 when token is invalid or expired.

**Preconditions:**
1. Bearer token is expired or malformed.

**Input / Steps:**
1. Send `GET /marketing/dashboard` with `Authorization: Bearer <invalid>`.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "Invalid or expired token" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-003
**Category:** GET /marketing/dashboard

**Description:** Verify 403 when an Admin token is used on this Marketing-only route.

**Preconditions:**
1. User logged in as Admin `admin-001`.

**Input / Steps:**
1. Send `GET /marketing/dashboard` with Admin Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "This endpoint is restricted to Marketing Executive role" }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-004
**Category:** GET /marketing/dashboard

**Description:** Verify empty state when the ME has no leads assigned.

**Preconditions:**
1. ME `me-002` logged in with zero leads assigned.

**Input / Steps:**
1. Send `GET /marketing/dashboard` with ME `me-002` Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. All card values are 0; conversion rate is `"0%"`.

**Priority:** Low | **Type:** Edge | **Traceability:** STORY-6.2.1

---

## 6. GET /marketing/dashboard/cards

### test-ep-6.2.1-b-005
**Category:** GET /marketing/dashboard/cards

**Description:** Verify that card counts are scoped server-side to the authenticated user and ignore any client-supplied `assigned_to` query parameter.

**Preconditions:**
1. ME `me-001` logged in with 50 leads, 5 follow-ups, 8 won, 3 lost.

**Input / Steps:**
1. Send `GET /marketing/dashboard/cards` with ME `me-001` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "my_leads": 50,
    "my_followups_today": 5,
    "my_won_leads": 8,
    "my_lost_leads": 3
  }
}
```

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-006
**Category:** GET /marketing/dashboard/cards

**Description:** Verify security — client-supplied `assigned_to` query param is ignored; data is always scoped to the JWT user.

**Preconditions:**
1. ME `me-001` logged in.
2. Another user `me-002` has different lead counts.

**Input / Steps:**
1. Send `GET /marketing/dashboard/cards?assigned_to=64f1a2b3c4d5e6f7a8b9c0d2` (another user's UUID) with ME `me-001` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "my_leads": 50,
    "my_followups_today": 5,
    "my_won_leads": 8,
    "my_lost_leads": 3
  },
  "meta": {
    "note": "assigned_to query param ignored; scope enforced from authenticated user"
  }
}
```
3. Values still reflect `me-001`'s data, not `me-002`'s.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-007
**Category:** GET /marketing/dashboard/cards

**Description:** Verify empty state when the user has no leads.

**Preconditions:**
1. ME `me-003` logged in with zero leads assigned.

**Input / Steps:**
1. Send `GET /marketing/dashboard/cards` with ME `me-003` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response: `{ "success": true, "data": { "my_leads": 0, "my_followups_today": 0, "my_won_leads": 0, "my_lost_leads": 0 } }`.

**Priority:** Low | **Type:** Edge | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-008
**Category:** GET /marketing/dashboard/cards

**Description:** Verify 403 when Admin token is used on this Marketing-only route.

**Preconditions:**
1. User logged in as Admin `admin-001`.

**Input / Steps:**
1. Send `GET /marketing/dashboard/cards` with Admin Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "This endpoint is restricted to Marketing Executive role" }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-009
**Category:** GET /marketing/dashboard/cards

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /marketing/dashboard/cards` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.2.1

---

## 7. GET /marketing/dashboard/conversion-rate

### test-ep-6.2.1-b-010
**Category:** GET /marketing/dashboard/conversion-rate

**Description:** Verify personal conversion rate is calculated as Won / (Won + Lost) for the authenticated user.

**Preconditions:**
1. ME `me-001` logged in with 8 won and 3 lost leads.

**Input / Steps:**
1. Send `GET /marketing/dashboard/conversion-rate` with ME `me-001` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "won": 8,
    "lost": 3,
    "total_closed": 11,
    "conversion_rate": "72.73%"
  }
}
```
3. `conversion_rate` is `"72.73%"` (8/11).

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-011
**Category:** GET /marketing/dashboard/conversion-rate

**Description:** Verify zero Won/Lost leads returns 0% without divide-by-zero error.

**Preconditions:**
1. ME `me-003` logged in with zero won and zero lost leads.

**Input / Steps:**
1. Send `GET /marketing/dashboard/conversion-rate` with ME `me-003` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "won": 0,
    "lost": 0,
    "total_closed": 0,
    "conversion_rate": "0%"
  }
}
```
3. No divide-by-zero error occurs; server gracefully returns 0%.

**Priority:** High | **Type:** Edge | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-012
**Category:** GET /marketing/dashboard/conversion-rate

**Description:** Verify date-range filter recalculates personal conversion rate within the specified timeframe.

**Preconditions:**
1. ME `me-001` logged in.
2. Within 2026-01-01 to 2026-06-30, ME has 5 won and 2 lost.

**Input / Steps:**
1. Send `GET /marketing/dashboard/conversion-rate?from=2026-01-01&to=2026-06-30` with ME `me-001` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "won": 5,
    "lost": 2,
    "total_closed": 7,
    "conversion_rate": "71.43%"
  }
}
```

**Priority:** Medium | **Type:** Positive | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-013
**Category:** GET /marketing/dashboard/conversion-rate

**Description:** Verify 403 when Admin token is used on this Marketing-only route.

**Preconditions:**
1. User logged in as Admin `admin-001`.

**Input / Steps:**
1. Send `GET /marketing/dashboard/conversion-rate` with Admin Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "This endpoint is restricted to Marketing Executive role" }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-014
**Category:** GET /marketing/dashboard/conversion-rate

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /marketing/dashboard/conversion-rate` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.2.1

---

## 8. GET /marketing/followups/today

### test-ep-6.2.1-b-015
**Category:** GET /marketing/followups/today

**Description:** Verify that today's follow-ups return leads assigned to the user with `next_followup_date = today`, sorted by `lead_quality` (Hot > Warm > Cold), paginated.

**Preconditions:**
1. ME `me-001` logged in.
2. 5 leads have `next_followup_date = today`, status NOT IN (Won, Lost), assigned to `me-001`.
3. Leads have varied `lead_quality` values (Hot, Warm, Cold).

**Input / Steps:**
1. Send `GET /marketing/followups/today?page=1&limit=20` with ME `me-001` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": [
    {
      "id": "l1",
      "lead_id": "LD-2026-00042",
      "company_name": "Acme Corp",
      "contact_person": "Ravi",
      "lead_quality": "Hot",
      "next_followup_date": "2026-07-09T10:00:00Z",
      "status": "Contacted"
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 1,
    "total_records": 5
  },
  "applied_filters": {
    "assigned_to": "current_user",
    "next_followup_date": "2026-07-09"
  }
}
```
3. Results sorted by `lead_quality` (Hot first, then Warm, then Cold).
4. `applied_filters` confirms server-side scoping.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-016
**Category:** GET /marketing/followups/today

**Description:** Verify empty state when no follow-ups are due today.

**Preconditions:**
1. ME `me-003` logged in with zero follow-ups due today.

**Input / Steps:**
1. Send `GET /marketing/followups/today` with ME `me-003` token.

**Expected Result:**
1. HTTP 200 OK.
2. Response: `{ "success": true, "data": [], "pagination": { "page": 1, "total_pages": 0, "total_records": 0 } }`.

**Priority:** Low | **Type:** Edge | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-017
**Category:** GET /marketing/followups/today

**Description:** Verify 403 when Admin token is used on this Marketing-only route.

**Preconditions:**
1. User logged in as Admin `admin-001`.

**Input / Steps:**
1. Send `GET /marketing/followups/today` with Admin Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "This endpoint is restricted to Marketing Executive role" }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-018
**Category:** GET /marketing/followups/today

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /marketing/followups/today` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.2.1

---

### test-ep-6.2.1-b-019
**Category:** GET /marketing/followups/today

**Description:** Verify pagination metadata reflects correct total when more follow-ups exceed page limit.

**Preconditions:**
1. ME `me-001` logged in.
2. 25 follow-ups due today assigned to `me-001`.

**Input / Steps:**
1. Send `GET /marketing/followups/today?page=1&limit=20` with ME `me-001` token.

**Expected Result:**
1. HTTP 200 OK.
2. `data` array contains exactly 20 items.
3. Pagination: `{ "page": 1, "total_pages": 2, "total_records": 25 }`.

**Priority:** Medium | **Type:** Edge | **Traceability:** STORY-6.2.1

---

## Part 3: STORY-6.3.1 — Export Lead Data

## 9. GET /admin/leads/export

### test-ep-6.3.1-b-001
**Category:** GET /admin/leads/export

**Description:** Verify Admin can export filtered leads as CSV. The export re-runs the same filters server-side and streams a binary file.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Lead List shows 245 leads matching filters: status=Contacted, quality=Hot, from=2026-01-01, to=2026-06-26.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=csv&status=Contacted&quality=Hot&from=2026-01-01&to=2026-06-26` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Content-Type: `text/csv`.
3. Content-Disposition: `attachment; filename="leads-export-{timestamp}.csv"`.
4. Response header `X-Record-Count: 245`.
5. Response header `X-Audit-Log-Id` is present.
6. CSV columns: `lead_id, company_name, category, sub_category, source, stage, owner, estimated_value, created_date`.
7. Exactly 245 data rows in the CSV.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.3.1

---

### test-ep-6.3.1-b-002
**Category:** GET /admin/leads/export

**Description:** Verify Admin can export as Excel format with matching row count.

**Preconditions:**
1. Admin `admin-001` logged in.
2. 62 Won leads exist within date range.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=excel&status=Won&from=2026-01-01&to=2026-06-26` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
3. Response header `X-Record-Count: 62`.
4. The `X-Record-Count` header exactly matches the `total_records` from the Lead List for the same filters.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.3.1

---

### test-ep-6.3.1-b-003
**Category:** GET /admin/leads/export

**Description:** Verify 400 when format parameter is not csv or excel.

**Preconditions:**
1. Admin `admin-001` logged in.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=pdf` with Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response: `{ "success": false, "message": "Format must be csv or excel" }`.

**Priority:** Medium | **Type:** Negative | **Traceability:** STORY-6.3.1

---

### test-ep-6.3.1-b-004
**Category:** GET /admin/leads/export

**Description:** Verify 404 when no leads match the applied filters.

**Preconditions:**
1. Admin `admin-001` logged in.
2. No leads exist with status `Nonexistent`.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=csv&status=Nonexistent` with Admin token.

**Expected Result:**
1. HTTP 404 Not Found.
2. Response: `{ "success": false, "message": "No leads found for the given filters" }`.

**Priority:** High | **Type:** Negative | **Traceability:** STORY-6.3.1

---

### test-ep-6.3.1-b-005
**Category:** GET /admin/leads/export

**Description:** Verify that filters matching zero leads still returns a valid file with headers only (0 data rows) and creates an audit log entry.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Filters match zero leads.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=csv&status=Nonexistent` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Binary file stream with header row only, 0 data rows.
3. Response header `X-Record-Count: 0`.
4. Response header `X-Audit-Log-Id` is present.
5. Audit log has an entry for this export with `record_count = 0`.

**Priority:** Medium | **Type:** Edge | **Traceability:** STORY-6.3.1

---

### test-ep-6.3.1-b-006
**Category:** GET /admin/leads/export

**Description:** Verify 403 when a Marketing Executive attempts to export leads.

**Preconditions:**
1. User logged in as ME `me-001`.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=csv` with ME token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{ "success": false, "message": "Export is restricted to Admin role" }`.

**Priority:** High | **Type:** Security | **Traceability:** STORY-6.3.1

---

### test-ep-6.3.1-b-007
**Category:** GET /admin/leads/export

**Description:** Verify 401 when no authentication token is provided.

**Preconditions:**
1. No Bearer token.

**Input / Steps:**
1. Send `GET /admin/leads/export?format=csv` without Authorization header.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. Response: `{ "success": false, "message": "No token provided" }`.

**Priority:** High | **Type:** Authentication | **Traceability:** STORY-6.3.1

---

## 10. GET /admin/audit-log (Export Verification)

### test-ep-6.3.1-b-008
**Category:** GET /admin/audit-log

**Description:** Verify that every export action is logged in the audit log with actor, record_count, format, and filter criteria.

**Preconditions:**
1. Admin `admin-001` logged in.
2. Previous export action was performed with filters: status=Contacted, quality=Hot, from=2026-01-01, to=2026-06-26, format=csv, record_count=245.

**Input / Steps:**
1. Send `GET /admin/audit-log?action=lead.exported&page=1&limit=20` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": [
    {
      "id": "66a1...",
      "action": "lead.exported",
      "entity": "lead",
      "performed_by": {
        "id": "u1",
        "name": "Admin Kumar",
        "role": "Admin"
      },
      "ip_address": "203.0.113.45",
      "details": {
        "record_count": 245,
        "format": "csv",
        "filters": {
          "status": "Contacted",
          "quality": "Hot",
          "from": "2026-01-01",
          "to": "2026-06-26"
        }
      },
      "timestamp": "2026-07-09T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 1,
    "total_records": 1
  }
}
```
3. Entry confirms actor, record_count, format, and filter criteria match the export performed in test-ep-6.3.1-b-001.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-6.3.1

---

> **End of Backend API Test Cases for EPIC-6** — Total: 54 test cases
