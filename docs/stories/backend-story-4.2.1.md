# EPIC-4: Follow-up Management — Backend API Test Cases (STORY-4.2.1: View Today's and Overdue Follow-ups)

> **Epic Goal:** Allow Marketing Executives to log follow-up activities against leads and maintain an auditable interaction history.
> **Story Goal:** As a Marketing Executive, I want to see today's and overdue follow-ups so that no opportunity is missed.
> **Tech Stack:** Node.js / Express / Postgres (Supabase) / Vitest
> **Total Test Cases:** 32

---

## Table of Contents
1. [GET /marketing/followups/today — Today's Follow-ups Queue](#1-get-marketingfollowupstoday--todays-follow-ups-queue)
2. [GET /marketing/followups/overdue — Overdue Follow-ups Queue](#2-get-marketingfollowupsoverdue--overdue-follow-ups-queue)
3. [GET /marketing/dashboard — Dashboard KPI counts](#3-get-marketingdashboard--dashboard-kpi-counts)
4. [POST /reminders/send-daily — Daily Reminder Notification Scheduler](#4-post-reminderssend-daily--daily-reminder-notification-scheduler)
5. [GET /notifications — Notification Fetching](#5-get-notifications--notification-fetching)
6. [GET /admin/dashboard/at-risk — Admin Widget Escalation](#6-get-admindashboardat-risk--admin-widget-escalation)
7. [GET /marketing/leads — Overdue Flags list retrieval](#7-get-marketingleads--overdue-flags-list-retrieval)

---

## 1. GET /marketing/followups/today — Today's Follow-ups Queue

**Test ID**
test-ep-4.2.1-b-001

**Category**
GET /marketing/followups/today

**Description**
Verify that a Marketing Executive can retrieve active leads assigned to themselves where next_followup_date is today.

**Preconditions**
1. User logged in as ME `user_id = "me-001"`.
2. Database has:
   - Lead A: assigned to `me-001`, stage = "Contacted", `next_followup_date = today` at 10:00 AM.
   - Lead B: assigned to `me-001`, stage = "Meeting Scheduled", `next_followup_date = today` at 2:00 PM.
   - Lead C: assigned to `me-002`, stage = "Contacted", `next_followup_date = today` at 11:00 AM.

**Input / Steps**
1. Send `GET /marketing/followups/today` with Bearer Token for `me-001`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. The payload returns Lead A and Lead B.
3. Lead C is excluded (assigned to a different user).
4. Leads are sorted by quality (`Hot` > `Warm` > `Cold`).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-002

**Category**
GET /marketing/followups/today

**Description**
Verify that today's follow-ups API returns an empty array when no active leads have next_followup_date set to today.

**Preconditions**
1. User logged in as `me-001`.
2. Database has no leads assigned to `me-001` with `next_followup_date` equal to today's date.

**Input / Steps**
1. Send `GET /marketing/followups/today`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns `{"success": true, "data": []}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-003

**Category**
GET /marketing/followups/today

**Description**
Verify that leads in closed stages (Won/Lost) are excluded from today's follow-up queue, even if next_followup_date is today.

**Preconditions**
1. User logged in as `me-001`.
2. Lead A: assigned to `me-001`, stage = "Won", `next_followup_date = today`.
3. Lead B: assigned to `me-001`, stage = "Lost", `next_followup_date = today`.

**Input / Steps**
1. Send `GET /marketing/followups/today`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns an empty data array `[]` (both closed leads are filtered out).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-004

**Category**
GET /marketing/followups/today

**Description**
Verify boundary condition: lead with next_followup_date set to today at exactly 12:00 AM (00:00:00) is included in the queue.

**Preconditions**
1. Current date is `2026-07-06`.
2. Lead A: assigned to `me-001`, `next_followup_date = "2026-07-06T00:00:00.000Z"`.

**Input / Steps**
1. Send `GET /marketing/followups/today`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Lead A is included in the response data.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-005

**Category**
GET /marketing/followups/today

**Description**
Verify that a Marketing Executive cannot query or access another user's today's follow-ups queue.

**Preconditions**
1. User is authenticated as `me-002` (Marketing Executive).

**Input / Steps**
1. Attempt to send `GET /marketing/followups/today?user_id=me-001` (trying to fetch `me-001`'s queue).

**Expected Result**
1. The server ignores the `user_id` query parameter and returns today's follow-ups for the authenticated user `me-002` only, OR
2. If explicit routing is attempted, returns 403 Forbidden.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-006

**Category**
GET /marketing/followups/today

**Description**
Verify unauthenticated request is blocked with HTTP 401.

**Preconditions**
1. No Authorization bearer header provided.

**Input / Steps**
1. Send `GET /marketing/followups/today`.

**Expected Result**
1. Response code is HTTP 401 Unauthorized.
2. Response contains error: `{"error": "Authentication required"}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-007

**Category**
GET /marketing/followups/today

**Description**
Verify that an Admin user can fetch today's follow-ups for all users or specify an owner filter.

**Preconditions**
1. User logged in as Admin `admin-001`.
2. Leads assigned to `me-001` and `me-002` are due today.

**Input / Steps**
1. Send `GET /marketing/followups/today` (no filter).
2. Send `GET /marketing/followups/today?assigned_to=me-001` (filtered).

**Expected Result**
1. Both requests return HTTP 200 OK.
2. The unfiltered request returns today's leads across all owners.
3. The filtered request returns today's leads assigned only to `me-001`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-84

---

## 2. GET /marketing/followups/overdue — Overdue Follow-ups Queue

**Test ID**
test-ep-4.2.1-b-008

**Category**
GET /marketing/followups/overdue

**Description**
Verify that a Marketing Executive can retrieve active leads assigned to themselves where next_followup_date is in the past.

**Preconditions**
1. User logged in as ME `me-001`.
2. Current date is `2026-07-06`.
3. Database has:
   - Lead A: assigned to `me-001`, `next_followup_date = "2026-07-03T10:00:00Z"` (3 days overdue).
   - Lead B: assigned to `me-001`, `next_followup_date = "2026-07-05T14:00:00Z"` (1 day overdue).
   - Lead C: assigned to `me-002`, `next_followup_date = "2026-07-01T11:00:00Z"` (5 days overdue).

**Input / Steps**
1. Send `GET /marketing/followups/overdue` with Bearer Token for `me-001`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns Lead A and Lead B.
3. Lead C (assigned to `me-002`) is excluded.
4. Response body includes `days_overdue` field calculated accurately: Lead A (`days_overdue: 3`), Lead B (`days_overdue: 1`).
5. Results are sorted by most overdue first (Lead A > Lead B).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-009

**Category**
GET /marketing/followups/overdue

**Description**
Verify that overdue follow-ups API returns an empty array when no active leads have next_followup_date set to the past.

**Preconditions**
1. User logged in as `me-001`.
2. Database has no leads assigned to `me-001` with `next_followup_date` in the past.

**Input / Steps**
1. Send `GET /marketing/followups/overdue`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns `{"success": true, "data": []}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-010

**Category**
GET /marketing/followups/overdue

**Description**
Verify that leads in closed stages (Won/Lost) are excluded from the overdue follow-up queue, even if next_followup_date is in the past.

**Preconditions**
1. User logged in as `me-001`.
2. Lead A: assigned to `me-001`, stage = "Won", `next_followup_date` is yesterday.
3. Lead B: assigned to `me-001`, stage = "Lost", `next_followup_date` is 5 days ago.

**Input / Steps**
1. Send `GET /marketing/followups/overdue`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns an empty data array `[]`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-011

**Category**
GET /marketing/followups/overdue

**Description**
Verify that `days_overdue` calculation handles timezone adjustments correctly.

**Preconditions**
1. Current date is `2026-07-06T01:00:00.000Z`.
2. Lead A: `next_followup_date = "2026-07-03T23:00:00.000Z"`.

**Input / Steps**
1. Send `GET /marketing/followups/overdue`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Lead A has `days_overdue: 3` (based on calendar day transitions: July 4, 5, and 6, not elapsed 24-hour periods).

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-012

**Category**
GET /marketing/followups/overdue

**Description**
Verify that a Marketing Executive cannot query or access another user's overdue follow-ups queue.

**Preconditions**
1. User is authenticated as `me-002` (Marketing Executive).

**Input / Steps**
1. Attempt to send `GET /marketing/followups/overdue?user_id=me-001`.

**Expected Result**
1. The server blocks the request or ignores the query parameter, returning only `me-002`'s overdue data.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-013

**Category**
GET /marketing/followups/overdue

**Description**
Verify that an Admin user can query overdue follow-ups for all users or specify an owner.

**Preconditions**
1. User logged in as Admin `admin-001`.

**Input / Steps**
1. Send `GET /marketing/followups/overdue` (no filter).
2. Send `GET /marketing/followups/overdue?assigned_to=me-001` (filtered).

**Expected Result**
1. Both requests return HTTP 200 OK.
2. The unfiltered request returns overdue leads across all owners.
3. The filtered request returns overdue leads assigned only to `me-001`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

## 3. GET /marketing/dashboard — Dashboard KPI counts

**Test ID**
test-ep-4.2.1-b-014

**Category**
GET /marketing/dashboard

**Description**
Verify that the ME dashboard endpoint returns accurate count metadata for today's and overdue follow-ups.

**Preconditions**
1. Authenticated user is `me-001`.
2. Database has:
   - 3 active leads assigned to `me-001` with `next_followup_date` = today.
   - 2 active leads assigned to `me-001` with `next_followup_date` = yesterday.

**Input / Steps**
1. Send `GET /marketing/dashboard` with Bearer token for `me-001`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload contains:
   `{"success":true,"data":{...,"todays_followups":3,"overdue_followups":2,...}}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-84, C1-85

---

**Test ID**
test-ep-4.2.1-b-015

**Category**
GET /marketing/dashboard

**Description**
Verify that GET /marketing/dashboard fails with 401 when token is missing or invalid.

**Preconditions**
1. Invalid JWT token.

**Input / Steps**
1. Send `GET /marketing/dashboard` with invalid Authorization header.

**Expected Result**
1. Response code is HTTP 401 Unauthorized.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-84

---

## 4. POST /reminders/send-daily — Daily Reminder Notification Scheduler

**Test ID**
test-ep-4.2.1-b-016

**Category**
POST /reminders/send-daily

**Description**
Verify that executing the daily reminders API successfully generates in-app notifications and email dispatch queue logs for today's follow-up leads.

**Preconditions**
1. Triggered by a mock cron client authenticated as Admin.
2. Target Date is `2026-07-06`.
3. Lead A is assigned to `me-001` with `next_followup_date = "2026-07-06T10:00:00Z"`.
4. Lead B is assigned to `me-002` with `next_followup_date = "2026-07-06T14:00:00Z"`.

**Input / Steps**
1. Send `POST /reminders/send-daily` with JSON body: `{"date": "2026-07-06"}`.
2. Query `notifications` table for created entries.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Payload returns: `{"success": true, "reminders_sent": 2, "breakdown": [{"user_id": "me-001", "leads_reminded": 1}, {"user_id": "me-002", "leads_reminded": 1}]}`.
3. In-app notification records are present in DB with `type = "lead_reminder"`, correct `user_id`, and `message` details.
4. Outbound email logs are inserted into queue table.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-b-017

**Category**
POST /reminders/send-daily

**Description**
Verify that daily reminder scheduler ignores closed leads (Won/Lost).

**Preconditions**
1. Target Date is `2026-07-06`.
2. Lead A: stage = "Won", `next_followup_date = "2026-07-06T10:00:00Z"`.

**Input / Steps**
1. Send `POST /reminders/send-daily` with `{"date": "2026-07-06"}`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response shows `reminders_sent: 0`. No notification records created for Lead A.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-b-018

**Category**
POST /reminders/send-daily

**Description**
Verify that a standard Marketing Executive cannot trigger the daily reminder scheduler endpoint.

**Preconditions**
1. Authenticated user is `me-001` (Marketing role).

**Input / Steps**
1. Send `POST /reminders/send-daily` with `{"date": "2026-07-06"}`.

**Expected Result**
1. Response code is HTTP 403 Forbidden.
2. Response contains error: `{"error": "Access denied. Admin role required."}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-b-019

**Category**
POST /reminders/send-daily

**Description**
Verify that the endpoint rejects invalid date string formats with 400 Bad Request.

**Preconditions**
1. Admin user authenticated.

**Input / Steps**
1. Send `POST /reminders/send-daily` with payload `{"date": "not-a-date"}`.

**Expected Result**
1. Response code is HTTP 400 Bad Request.
2. Response body: `{"success": false, "message": "Invalid date format. Use YYYY-MM-DD"}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.2.1, C1-86

---

**Test ID**
test-ep-4.2.1-b-020

**Category**
POST /reminders/send-daily

**Description**
Verify scheduler idempotency: running the scheduler multiple times on the same date does not duplicate notifications.

**Preconditions**
1. Target Date is `2026-07-06`.
2. Scheduler has already run once today, sending 1 reminder for Lead A.

**Input / Steps**
1. Send `POST /reminders/send-daily` with payload `{"date": "2026-07-06"}` a second time.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response returns `reminders_sent: 0` (or skips duplication).
3. The notifications table does not record any duplicate entries for Lead A on `2026-07-06`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-86

---

## 5. GET /notifications — Notification Fetching

**Test ID**
test-ep-4.2.1-b-021

**Category**
GET /notifications

**Description**
Verify that a user can retrieve their notifications including daily follow-up reminders.

**Preconditions**
1. User logged in is `me-001`.
2. Database has 2 notification records for `me-001`.

**Input / Steps**
1. Send `GET /notifications` with Bearer token for `me-001`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns `data` array containing the 2 notifications.
3. Unread counts display correctly.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-86

---

## 6. GET /admin/dashboard/at-risk — Admin Widget Escalation

**Test ID**
test-ep-4.2.1-b-022

**Category**
GET /admin/dashboard/at-risk

**Description**
Verify that Admin can fetch active leads overdue by 3 or more calendar days, retrieving lead, owner, and days overdue.

**Preconditions**
1. User logged in is Admin `admin-001`.
2. Current date is `2026-07-06`.
3. Database has:
   - Lead A: owner = `me-001`, `next_followup_date = "2026-07-01"` (5 days overdue, active).
   - Lead B: owner = `me-002`, `next_followup_date = "2026-07-03"` (3 days overdue, active).
   - Lead C: owner = `me-001`, `next_followup_date = "2026-07-05"` (1 day overdue, active).
   - Lead D: owner = `me-001`, `next_followup_date = "2026-07-01"`, stage = "Won" (5 days overdue, closed).

**Input / Steps**
1. Send `GET /admin/dashboard/at-risk` with parameter `?overdue_days=3` (or defaults to 3).

**Expected Result**
1. Response code is HTTP 200 OK.
2. The payload returns Lead A and Lead B.
3. Lead C (only 1 day overdue) and Lead D (closed stage) are excluded.
4. Each entry includes: `lead_id`, `company_name`, `owner` (name + ID), and `days_overdue`.
5. Sorted in descending order of days overdue (Lead A > Lead B).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-b-023

**Category**
GET /admin/dashboard/at-risk

**Description**
Verify that a Marketing Executive cannot query the Admin At-Risk dashboard escalation endpoint.

**Preconditions**
1. Authenticated user is `me-001` (Marketing Executive).

**Input / Steps**
1. Send `GET /admin/dashboard/at-risk`.

**Expected Result**
1. Response code is HTTP 403 Forbidden.
2. Payload returns error: `{"error": "Access denied. Admin role required."}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-b-024

**Category**
GET /admin/dashboard/at-risk

**Description**
Verify that At-Risk query filter `overdue_days` works for custom day configurations.

**Preconditions**
1. Admin user authenticated.
2. Lead A (5 days overdue), Lead B (3 days overdue).

**Input / Steps**
1. Send `GET /admin/dashboard/at-risk?overdue_days=5`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Returns Lead A only (Lead B excluded since it is only 3 days overdue).

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-b-025

**Category**
GET /admin/dashboard/at-risk

**Description**
Verify query performance on large datasets (50,000+ leads) does not cause timeouts.

**Preconditions**
1. Admin user authenticated.
2. DB contains 50,000 leads with indexed next_followup_date fields.

**Input / Steps**
1. Send `GET /admin/dashboard/at-risk`.
2. Measure backend execution response latency.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Latency is under 2000ms.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-87

---

## 7. GET /marketing/leads — Overdue Flags list retrieval

**Test ID**
test-ep-4.2.1-b-026

**Category**
GET /marketing/leads

**Description**
Verify that the general leads list returns next_followup_date and a calculated is_overdue flag to allow rendering red indicators.

**Preconditions**
1. Current date is `2026-07-06`.
2. User authenticated as `me-001`.
3. Database contains Lead A (`next_followup_date` in past, active) and Lead B (`next_followup_date` in future, active).

**Input / Steps**
1. Send `GET /marketing/leads` with Bearer token.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload data objects contain:
   - Lead A: `"next_followup_date": "2026-07-01...", "is_overdue": true`
   - Lead B: `"next_followup_date": "2026-07-15...", "is_overdue": false`

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-027

**Category**
GET /marketing/leads

**Description**
Verify that `is_overdue` flag is always returned as false for closed leads, regardless of their past next_followup_date.

**Preconditions**
1. Current date is `2026-07-06`.
2. Lead A: stage = "Won", `next_followup_date = "2026-07-01"`.
3. Lead B: stage = "Lost", `next_followup_date = "2026-07-01"`.

**Input / Steps**
1. Send `GET /marketing/leads`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response contains:
   - Lead A: `is_overdue: false`
   - Lead B: `is_overdue: false`

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-85

---

**Test ID**
test-ep-4.2.1-b-028

**Category**
GET /marketing/followups/today

**Description**
Verify SQL injection attempt on GET filter parameter is sanitized.

**Preconditions**
1. Authenticated user.

**Input / Steps**
1. Send `GET /marketing/followups/today?assigned_to='; DROP TABLE leads; --`.

**Expected Result**
1. Response code is HTTP 400 Bad Request or 200 OK with no records returned.
2. Database table structure is unmodified (no injection executed).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-029

**Category**
GET /admin/dashboard/at-risk

**Description**
Verify SQL injection attempt on Admin At-Risk filter parameter.

**Preconditions**
1. Admin authenticated.

**Input / Steps**
1. Send `GET /admin/dashboard/at-risk?overdue_days=3; DROP TABLE notifications;`.

**Expected Result**
1. Response code is HTTP 400 Bad Request (invalid format) or parsed safely as number 3.
2. No database tables are dropped.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.2.1, C1-87

---

**Test ID**
test-ep-4.2.1-b-030

**Category**
GET /marketing/dashboard

**Description**
Verify response latency for ME dashboard load on massive leads dataset.

**Preconditions**
1. ME `me-001` has 500 assigned leads.

**Input / Steps**
1. Send `GET /marketing/dashboard`.

**Expected Result**
1. Response code is 200 OK.
2. Response time is under 1500ms.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-031

**Category**
GET /marketing/followups/today

**Description**
Verify that a past date in next_followup_date is excluded from today's follow-up queue.

**Preconditions**
1. Current date is `2026-07-06`.
2. Lead A: assigned to `me-001`, `next_followup_date = "2026-07-05T23:59:59Z"`.

**Input / Steps**
1. Send `GET /marketing/followups/today`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Lead A is excluded from the today's queue (appears in overdue instead).

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-84

---

**Test ID**
test-ep-4.2.1-b-032

**Category**
GET /marketing/followups/overdue

**Description**
Verify that a future date in next_followup_date is excluded from the overdue queue.

**Preconditions**
1. Current date is `2026-07-06`.
2. Lead A: assigned to `me-001`, `next_followup_date = "2026-07-07T00:00:00Z"`.

**Input / Steps**
1. Send `GET /marketing/followups/overdue`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Lead A is excluded from the overdue list.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.2.1, C1-85

---

> **End of Backend API Test Cases for STORY-4.2.1** — Total: 32 test cases (Sections 1–7)
