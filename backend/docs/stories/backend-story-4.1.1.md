# EPIC-4: Follow-up Management — Backend API Test Cases (STORY-4.1.1: Log Follow-up Activity)

> **Epic Goal:** Allow Marketing Executives to log follow-up activities against leads and maintain an auditable interaction history.
> **Story Goal:** As a Marketing Executive, I want to log a follow-up activity against a lead so that every interaction with the customer is documented.
> **Database ERD Design:** Supabase PostgreSQL (Leads, Followups, Lead History, Users)
> **Auth Context:** Marketing Executive (ME) can create follow-ups only for leads assigned to themselves. Admin can view all follow-ups.
> **Total Test Cases:** 72

---

## Table of Contents
1. [API-1: POST /marketing/leads/:id/followups — Create Follow-up (C1-77)](#1-api-1-post-marketingleadsidfollowups--create-follow-up-c1-77)
2. [API-2: GET /marketing/leads/:id/timeline — Enhanced Timeline (C1-82)](#2-api-2-get-marketingleadsidtimeline--enhanced-timeline-c1-82)
3. [API-3: GET /marketing/followups/today — Today's Follow-ups](#3-api-3-get-marketingfollowupstoday--todays-follow-ups)
4. [API-4: GET /marketing/followups/overdue — Overdue Follow-ups](#4-api-4-get-marketingfollowupsoverdue--overdue-follow-ups)
5. [Cross-Cutting: Immutability & Audit (C1-81, C1-82)](#5-cross-cutting-immutability--audit-c1-81-c1-82)

---

## 1. API-1: POST /marketing/leads/:id/followups — Create Follow-up (C1-77)
*Purpose: Marketing Executive logs a follow-up activity against a lead assigned to them. Auto-sets author and timestamp (non-editable). Updates lead's proposal_value if proposal_amount provided.*

### 1.1 Positive Scenarios

* **test-ep-4.1.1-001 (Positive)**:
  * *Description:* Create follow-up with all valid fields (Call, Interested, with next_followup_date)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with JSON body:
    `{"followup_type":"Call","outcome":"Interested","notes":"Customer showed interest in CRM product","next_followup_date":"2026-07-10T10:00:00Z","proposal_amount":null}`.
    Authenticated as Marketing Executive `user_id = "me-001"` who owns `leadId`.
  * *Expected Output:* HTTP 201 Created. Response:
    `{"success":true,"message":"Follow-up recorded","data":{"id":"uuid","lead_id":"uuid","followup_type":"Call","outcome":"Interested","notes":"Customer showed interest in CRM product","next_followup_date":"2026-07-10T10:00:00Z","proposal_amount":null,"stage_at_log":"Contacted","created_by":{"id":"me-001","name":"John Doe"},"created_at":"2026-07-06T12:00:00Z","correction_notes":null}}`.
    `created_by` and `created_at` are set server-side, ignored from request body. Lead's `proposal_value` unchanged. Lead history entry created for follow-up event.
  * *Traceability:* STORY-4.1.1, C1-77, C1-78, C1-79, C1-82

* **test-ep-4.1.1-002 (Positive)**:
  * *Description:* Create follow-up with Outcome = Not Interested (closing outcome) and blank next_followup_date
  * *Input:* `POST /marketing/leads/{leadId}/followups` with JSON body:
    `{"followup_type":"Call","outcome":"Not Interested","notes":"Customer declined","next_followup_date":null,"proposal_amount":null}`.
    Authenticated as ME owning the lead.
  * *Expected Output:* HTTP 201 Created. Follow-up saved without `next_followup_date`. Lead stage may remain unchanged (Not Interested does not auto-close the lead in the system, but the outcome records the customer's response).
  * *Traceability:* STORY-4.1.1, C1-80

* **test-ep-4.1.1-003 (Positive)**:
  * *Description:* Create follow-up with Proposal Amount updates lead's proposal_value
  * *Input:* `POST /marketing/leads/{leadId}/followups` with JSON body:
    `{"followup_type":"Proposal Discussion","outcome":"Proposal Requested","notes":"Discussed pricing","next_followup_date":"2026-07-15T10:00:00Z","proposal_amount":75000}`.
    Lead's current `proposal_value` is 0. Authenticated as ME owning the lead.
  * *Expected Output:* HTTP 201 Created. Follow-up saved with `proposal_amount: 75000`. Lead's `proposal_value` in `leads` table updated to `75000`. Response includes:
    `{"success":true,"message":"Follow-up recorded","data":{...},"lead_updated":{"proposal_value":75000}}`.
  * *Traceability:* STORY-4.1.1, AC4, C1-77

* **test-ep-4.1.1-004 (Positive)**:
  * *Description:* Create follow-up with newer Proposal Amount overwrites previous value
  * *Input:* Follow-up A created with `proposal_amount: 50000`. Then `POST /marketing/leads/{leadId}/followups` with `proposal_amount: 85000`. Lead's current `proposal_value` is 50000.
  * *Expected Output:* HTTP 201 Created. Lead's `proposal_value` updated from 50000 to 85000. The latest proposal amount always wins.
  * *Traceability:* STORY-4.1.1, AC4

* **test-ep-4.1.1-005 (Positive)**:
  * *Description:* Create follow-up for each valid followup_type
  * *Input:* 7 separate POST requests with each valid type: `Call`, `WhatsApp`, `Email`, `Online Meeting`, `Client Meeting`, `Demo`, `Proposal Discussion`. All other valid fields included.
  * *Expected Output:* HTTP 201 Created for all. `followup_type` stored as provided.
  * *Traceability:* STORY-4.1.1, C1-78

* **test-ep-4.1.1-006 (Positive)**:
  * *Description:* Create follow-up for each valid outcome
  * *Input:* 6 separate POST requests with each valid outcome: `Interested`, `Need More Info`, `Proposal Requested`, `Budget Discussion`, `Decision Pending`, `Not Interested`. All with valid `next_followup_date`.
  * *Expected Output:* HTTP 201 Created for all. `outcome` stored as provided.
  * *Traceability:* STORY-4.1.1, C1-79

* **test-ep-4.1.1-007 (Positive)**:
  * *Description:* Create follow-up with minimal required fields (followup_type, outcome, next_followup_date)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with JSON body:
    `{"followup_type":"Email","outcome":"Need More Info","next_followup_date":"2026-07-12T09:00:00Z"}`.
    No `notes` or `proposal_amount` provided.
  * *Expected Output:* HTTP 201 Created. `notes` defaults to null. `proposal_amount` defaults to null. Follow-up saved successfully.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-008 (Positive)**:
  * *Description:* Admin creates follow-up for any lead
  * *Input:* `POST /marketing/leads/{leadId}/followups` with valid body. Authenticated as Admin `user_id = "admin-001"`. Lead is assigned to a different ME.
  * *Expected Output:* HTTP 201 Created. Admin bypasses ownership check. Follow-up recorded against the lead.
  * *Traceability:* STORY-4.1.1, C1-77

### 1.2 Negative Scenarios

* **test-ep-4.1.1-009 (Negative)**:
  * *Description:* Missing `followup_type` field
  * *Input:* `POST /marketing/leads/{leadId}/followups` with JSON body:
    `{"outcome":"Interested","next_followup_date":"2026-07-10T10:00:00Z"}`.
    Authenticated as ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"followup_type": "Follow-up type is required"}`. No record created.
  * *Traceability:* STORY-4.1.1, C1-77, C1-78

* **test-ep-4.1.1-010 (Negative)**:
  * *Description:* Invalid `followup_type` enum value
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"SMS","outcome":"Interested","next_followup_date":"2026-07-10T10:00:00Z"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"followup_type": "Follow-up type must be one of: Call, WhatsApp, Email, Online Meeting, Client Meeting, Demo, Proposal Discussion"}`.
  * *Traceability:* STORY-4.1.1, C1-78

* **test-ep-4.1.1-011 (Negative)**:
  * *Description:* Missing `outcome` field
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Call","next_followup_date":"2026-07-10T10:00:00Z"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"outcome": "Outcome is required"}`.
  * *Traceability:* STORY-4.1.1, C1-79

* **test-ep-4.1.1-012 (Negative)**:
  * *Description:* Invalid `outcome` enum value
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Call","outcome":"Maybe","next_followup_date":"2026-07-10T10:00:00Z"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"outcome": "Outcome must be one of: Interested, Need More Info, Proposal Requested, Budget Discussion, Decision Pending, Not Interested"}`.
  * *Traceability:* STORY-4.1.1, C1-79

* **test-ep-4.1.1-013 (Negative)**:
  * *Description:* Outcome = Decision Pending with blank next_followup_date (AC1)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Call","outcome":"Decision Pending","notes":"Client will decide next week","next_followup_date":null}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"next_followup_date": "Next Follow-up Date is required unless the outcome closes the lead."}`. No record created.
  * *Traceability:* STORY-4.1.1, AC1, C1-80

* **test-ep-4.1.1-014 (Negative)**:
  * *Description:* Outcome = Interested with blank next_followup_date (non-closing outcome)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Email","outcome":"Interested","next_followup_date":null}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"next_followup_date": "Next Follow-up Date is required unless the outcome closes the lead."}`.
  * *Traceability:* STORY-4.1.1, AC1, C1-80

* **test-ep-4.1.1-015 (Negative)**:
  * *Description:* Lead not found
  * *Input:* `POST /marketing/leads/{nonExistentLeadId}/followups` with valid body. `leadId` is a valid UUID not in database.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Lead not found"}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-016 (Negative)**:
  * *Description:* Lead not assigned to the authenticated Marketing Executive
  * *Input:* `POST /marketing/leads/{leadId}/followups` with valid body. Authenticated as ME `me-002`. `leadId` is assigned to `me-001`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Not authorized to perform action on this lead"}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-017 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `POST /marketing/leads/{leadId}/followups` with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized. JSON error: `{"error": "Authentication required"}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-018 (Negative)**:
  * *Description:* Invalid leadId format (not a UUID)
  * *Input:* `POST /marketing/leads/invalid-id/followups` with valid body.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"error": "Invalid lead ID format"}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-019 (Negative)**:
  * *Description:* `next_followup_date` is not a valid date string
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Call","outcome":"Interested","next_followup_date":"not-a-date"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"next_followup_date": "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)"}`.
  * *Traceability:* STORY-4.1.1, C1-80

* **test-ep-4.1.1-020 (Negative)**:
  * *Description:* `proposal_amount` is negative
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Proposal Discussion","outcome":"Proposal Requested","next_followup_date":"2026-07-15T10:00:00Z","proposal_amount":-100}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"proposal_amount": "Proposal amount must be a non-negative number"}`.
  * *Traceability:* STORY-4.1.1, AC4

* **test-ep-4.1.1-021 (Negative)**:
  * *Description:* `proposal_amount` is not a number
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `{"followup_type":"Proposal Discussion","outcome":"Proposal Requested","next_followup_date":"2026-07-15T10:00:00Z","proposal_amount":"abc"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"proposal_amount": "Proposal amount must be a number"}`.
  * *Traceability:* STORY-4.1.1, AC4

### 1.3 Edge Cases

* **test-ep-4.1.1-022 (Edge)**:
  * *Description:* `notes` at maximum allowed length (1000 characters)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `notes` = 1000 character string. All other fields valid.
  * *Expected Output:* HTTP 201 Created. Notes stored successfully.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-023 (Edge)**:
  * *Description:* `notes` exceeding maximum length (1001+ characters)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `notes` = 1001 character string.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"notes": "Notes must be 1000 characters or less"}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-024 (Edge)**:
  * *Description:* Multiple follow-ups on same lead — each has unique timestamp
  * *Input:* Create 3 follow-ups for the same lead within 1 second intervals.
  * *Expected Output:* HTTP 201 Created for all. Each has a distinct `created_at` timestamp with millisecond precision. Order is preserved.
  * *Traceability:* STORY-4.1.1, AC2

* **test-ep-4.1.1-025 (Edge)**:
  * *Description:* `next_followup_date` is in the past (historical backfill)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `next_followup_date` = yesterday's date.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"next_followup_date": "Next follow-up date must be today or a future date"}`. OR HTTP 201 Created if business allows past dates (confirm per business rule).
  * *Traceability:* STORY-4.1.1, C1-80

* **test-ep-4.1.1-026 (Edge)**:
  * *Description:* `proposal_amount = 0` is explicitly allowed
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `proposal_amount: 0`.
  * *Expected Output:* HTTP 201 Created. `proposal_amount` stored as 0. Lead's `proposal_value` updated to 0.
  * *Traceability:* STORY-4.1.1, AC4

* **test-ep-4.1.1-027 (Edge)**:
  * *Description:* Very large proposal amount (999999999.99)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `proposal_amount: 999999999.99`.
  * *Expected Output:* HTTP 201 Created if within NUMERIC(12,2) range. HTTP 400 if exceeds column precision.
  * *Traceability:* STORY-4.1.1, AC4

* **test-ep-4.1.1-028 (Edge)**:
  * *Description:* Create follow-up for a lead that is in Won/Lost stage
  * *Input:* `POST /marketing/leads/{leadId}/followups` where lead's stage is "Won" or "Lost". Valid body.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Cannot add follow-up to a closed lead. Contact Admin to reopen."}`.
  * *Traceability:* STORY-4.1.1, C1-77

---

## 2. API-2: GET /marketing/leads/:id/timeline — Enhanced Timeline (C1-82)
*Purpose: Returns a combined timeline of status changes and follow-up events for a lead, sorted reverse chronological. Enhanced to include follow-up records.*

### 2.1 Positive Scenarios

* **test-ep-4.1.1-029 (Positive)**:
  * *Description:* Timeline includes follow-up events alongside status changes
  * *Input:* `GET /marketing/leads/{leadId}/timeline`. Lead has 3 status changes and 2 follow-ups. Authenticated as ME owning the lead.
  * *Expected Output:* HTTP 200 OK. Response includes all 5 events in the `data` array. Each follow-up event has: `type: "followup"`, `followup_type`, `outcome`, `notes`, `created_by` (user object), `created_at`. Events sorted reverse chronological (newest first).
  * *Traceability:* STORY-4.1.1, AC2, C1-82

* **test-ep-4.1.1-030 (Positive)**:
  * *Description:* Filter timeline by type=followup
  * *Input:* `GET /marketing/leads/{leadId}/timeline?type=followup`. Lead has 3 status changes and 2 follow-ups.
  * *Expected Output:* HTTP 200 OK. Returns only the 2 follow-up events. Each has `type: "followup"`. Status change events are excluded.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-031 (Positive)**:
  * *Description:* Timeline pagination works with follow-up events
  * *Input:* `GET /marketing/leads/{leadId}/timeline?page=1&limit=10`. Lead has 25 total events.
  * *Expected Output:* HTTP 200 OK. Returns 10 events on page 1. Pagination metadata: `{"page": 1, "totalPages": 3, "totalCount": 25, "hasMore": true}`.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-032 (Positive)**:
  * *Description:* Follow-up event includes author name and timestamp
  * *Input:* `GET /marketing/leads/{leadId}/timeline?type=followup`. An existing follow-up was created by `me-001` (name: "John Doe").
  * *Expected Output:* Each follow-up event includes: `"created_by": {"id": "me-001", "name": "John Doe"}`, `"created_at": "2026-07-06T12:00:00Z"`.
  * *Traceability:* STORY-4.1.1, AC2, C1-81

* **test-ep-4.1.1-033 (Positive)**:
  * *Description:* Admin can view any lead's timeline
  * *Input:* `GET /marketing/leads/{leadId}/timeline`. Authenticated as Admin. Lead is assigned to a different ME.
  * *Expected Output:* HTTP 200 OK. Admin sees full timeline including follow-ups and status changes.
  * *Traceability:* STORY-4.1.1, C1-82

### 2.2 Negative Scenarios

* **test-ep-4.1.1-034 (Negative)**:
  * *Description:* Lead not found
  * *Input:* `GET /marketing/leads/{nonExistentLeadId}/timeline`.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Lead not found"}`.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-035 (Negative)**:
  * *Description:* Marketing Executive cannot view another user's lead timeline
  * *Input:* `GET /marketing/leads/{leadId}/timeline`. Authenticated as ME `me-002`. Lead assigned to `me-001`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Not authorized to view this lead's timeline"}`.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-036 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `GET /marketing/leads/{leadId}/timeline`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-037 (Negative)**:
  * *Description:* Invalid type filter parameter
  * *Input:* `GET /marketing/leads/{leadId}/timeline?type=invalid_type`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"type": "Invalid type filter. Must be one or more of: created, status_change, followup, assigned"}`.
  * *Traceability:* STORY-4.1.1, C1-82

### 2.3 Edge Cases

* **test-ep-4.1.1-038 (Edge)**:
  * *Description:* Lead with no events (empty timeline)
  * *Input:* `GET /marketing/leads/{newLeadId}/timeline`. Lead was just created with no activities.
  * *Expected Output:* HTTP 200 OK. `{"data": {"lead_id": "...", "company_name": "...", "timeline": []}}`. Empty array returned, no error.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-039 (Edge)**:
  * *Description:* Multiple type filters combined
  * *Input:* `GET /marketing/leads/{leadId}/timeline?type=followup&type=status_change`.
  * *Expected Output:* HTTP 200 OK. Returns only follow-up and status change events. Created and assigned events excluded.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-040 (Edge)**:
  * *Description:* Page number exceeds total pages
  * *Input:* `GET /marketing/leads/{leadId}/timeline?page=999`. Lead has only 5 total events, limit=10.
  * *Expected Output:* HTTP 200 OK. Empty data array. `{"page": 999, "totalPages": 1, "totalCount": 5, "hasMore": false, "data": []}`.
  * *Traceability:* STORY-4.1.1, C1-82

---

## 3. API-3: GET /marketing/followups/today — Today's Follow-ups
*Purpose: Returns leads assigned to the authenticated user where next_followup_date is today and stage is not Won/Lost. Sorted by lead quality (Hot > Warm > Cold).*

### 3.1 Positive Scenarios

* **test-ep-4.1.1-041 (Positive)**:
  * *Description:* Returns today's follow-ups correctly
  * *Input:* `GET /marketing/followups/today`. Authenticated as ME. Database has 3 leads assigned to this ME with `next_followup_date = today` and status != Won/Lost.
  * *Expected Output:* HTTP 200 OK. Returns array of 3 leads. Each lead includes: `id`, `company_name`, `contact_person`, `lead_quality`, `next_followup_date`, `stage`. Sorted Hot > Warm > Cold. Leads with Won/Lost stage excluded.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-042 (Positive)**:
  * *Description:* Returns empty array when no follow-ups due today
  * *Input:* `GET /marketing/followups/today`. No leads assigned to ME have `next_followup_date = today`.
  * *Expected Output:* HTTP 200 OK. `{"success": true, "data": []}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-043 (Positive)**:
  * *Description:* Admin can view today's follow-ups for all users
  * *Input:* `GET /marketing/followups/today`. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns all leads (across all assignees) with `next_followup_date = today`.
  * *Traceability:* STORY-4.1.1, C1-77

### 3.2 Negative/Edge Scenarios

* **test-ep-4.1.1-044 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `GET /marketing/followups/today`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-045 (Edge)**:
  * *Description:* Lead with next_followup_date = today but stage = Won/Lost is excluded
  * *Input:* `GET /marketing/followups/today`. A lead assigned to ME has `next_followup_date = today` but `stage = "Won"`.
  * *Expected Output:* HTTP 200 OK. Won/Lost leads are filtered out from results.
  * *Traceability:* STORY-4.1.1, C1-77

---

## 4. API-4: GET /marketing/followups/overdue — Overdue Follow-ups
*Purpose: Returns leads assigned to the authenticated user where next_followup_date is before today and stage is not Won/Lost. Includes days_overdue field. Sorted by most overdue first.*

### 4.1 Positive Scenarios

* **test-ep-4.1.1-046 (Positive)**:
  * *Description:* Returns overdue follow-ups with days_overdue
  * *Input:* `GET /marketing/followups/overdue`. Authenticated as ME. Database has 2 leads with `next_followup_date` = 3 days ago and 5 days ago.
  * *Expected Output:* HTTP 200 OK. Returns array of 2 leads. Each includes: `id`, `company_name`, `contact_person`, `next_followup_date`, `days_overdue` (integer), `stage`, `lead_quality`. Sorted by most overdue first (5 days > 3 days).
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-047 (Positive)**:
  * *Description:* Returns empty array when no overdue follow-ups
  * *Input:* `GET /marketing/followups/overdue`. All leads assigned to ME have future `next_followup_date` or null.
  * *Expected Output:* HTTP 200 OK. `{"success": true, "data": []}`.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-048 (Positive)**:
  * *Description:* Admin can view all overdue follow-ups
  * *Input:* `GET /marketing/followups/overdue`. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns all overdue leads across all assignees.
  * *Traceability:* STORY-4.1.1, C1-77

### 4.2 Negative/Edge Scenarios

* **test-ep-4.1.1-049 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `GET /marketing/followups/overdue`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-050 (Edge)**:
  * *Description:* `days_overdue` is calculated accurately (timezone-aware)
  * *Input:* `GET /marketing/followups/overdue`. Lead has `next_followup_date = "2026-07-03T23:00:00Z"`, current time is `2026-07-06T01:00:00Z`.
  * *Expected Output:* HTTP 200 OK. `days_overdue: 3` (full calendar days overdue, not 24-hour periods).
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-051 (Edge)**:
  * *Description:* Lead with null next_followup_date should not appear in overdue results
  * *Input:* `GET /marketing/followups/overdue`. Lead has `next_followup_date = null`.
  * *Expected Output:* Lead with null next_followup_date is excluded from overdue list.
  * *Traceability:* STORY-4.1.1, C1-77

---

## 5. Cross-Cutting: Immutability & Audit (C1-81, C1-82)

* **test-ep-4.1.1-052 (Positive)**:
  * *Description:* `created_by` is auto-set from JWT, ignored from request body
  * *Input:* `POST /marketing/leads/{leadId}/followups` with body that includes `"created_by": "some-other-user-id"`. Authenticated as `me-001`.
  * *Expected Output:* HTTP 201 Created. `created_by.id` in response is `me-001` (the authenticated user), NOT the value from the request body. Server-side value overrides any client-provided value.
  * *Traceability:* STORY-4.1.1, C1-81

* **test-ep-4.1.1-053 (Positive)**:
  * *Description:* `created_at` is auto-set to server timestamp, ignored from request body
  * *Input:* `POST /marketing/leads/{leadId}/followups` with body that includes `"created_at": "2020-01-01T00:00:00Z"`.
  * *Expected Output:* HTTP 201 Created. `created_at` in response is the server's current timestamp, not the client-provided value.
  * *Traceability:* STORY-4.1.1, C1-81

* **test-ep-4.1.1-054 (Negative)**:
  * *Description:* PUT/PATCH on followup record is rejected
  * *Input:* `PUT /marketing/leads/{leadId}/followups/{followupId}` with JSON body attempting to change `outcome`. Or `PATCH` with partial update.
  * *Expected Output:* HTTP 405 Method Not Allowed or HTTP 403 Forbidden. JSON error: `{"error": "Follow-up records are immutable. Use correction endpoint instead."}`.
  * *Traceability:* STORY-4.1.1, AC3, C1-81

* **test-ep-4.1.1-055 (Negative)**:
  * *Description:* DELETE on followup record is rejected
  * *Input:* `DELETE /marketing/leads/{leadId}/followups/{followupId}`.
  * *Expected Output:* HTTP 405 Method Not Allowed or HTTP 403 Forbidden. JSON error: `{"error": "Follow-up records cannot be deleted"}`.
  * *Traceability:* STORY-4.1.1, AC3, C1-81

* **test-ep-4.1.1-056 (Positive)**:
  * *Description:* Correction note can be appended to existing follow-up
  * *Input:* `POST /marketing/leads/{leadId}/followups/{followupId}/correction` with `{"correction_notes": "Updated contact number noted"}`. Authenticated as ME who created the original follow-up.
  * *Expected Output:* HTTP 200 OK. Follow-up record updated with `correction_notes`, `correction_by` (user id), `correction_at` (timestamp). Original `created_by`, `created_at`, `followup_type`, `outcome`, `notes` remain unchanged.
  * *Traceability:* STORY-4.1.1, AC3, C1-81

* **test-ep-4.1.1-057 (Negative)**:
  * *Description:* Correction note with empty body
  * *Input:* `POST /marketing/leads/{leadId}/followups/{followupId}/correction` with `{"correction_notes": ""}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"correction_notes": "Correction notes cannot be empty"}`.
  * *Traceability:* STORY-4.1.1, AC3, C1-81

* **test-ep-4.1.1-058 (Positive)**:
  * *Description:* Follow-up creation writes to Lead History (C1-82)
  * *Input:* `POST /marketing/leads/{leadId}/followups` with valid body. Then query `lead_history` table for this lead.
  * *Expected Output:* HTTP 201 Created. `lead_history` contains a new entry with: `field_name = "followup_logged"`, `change_summary` containing follow-up type, outcome, and author name. `changed_by` matches the authenticated user.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-059 (Positive)**:
  * *Description:* Follow-up creation writes to Audit Log
  * *Input:* `POST /marketing/leads/{leadId}/followups` with valid body.
  * *Expected Output:* `audit_log` contains entry with: `action = "FOLLOWUP_CREATED"`, `resource = "Followup"`, `resourceId` = follow-up UUID, `userId` = authenticated user. Details include follow-up type and outcome.
  * *Traceability:* STORY-4.1.1, C1-82

* **test-ep-4.1.1-060 (Security)**:
  * *Description:* XSS attempt in notes field
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `notes = "<script>alert('xss')</script>"`. All other fields valid.
  * *Expected Output:* HTTP 201 Created. Notes stored as-is but output must be HTML-escaped when rendered in timeline. No script execution.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-061 (Security)**:
  * *Description:* SQL injection attempt in followup_type field
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `followup_type = "'; DROP TABLE followups; --"`.
  * *Expected Output:* HTTP 400 Bad Request (invalid enum) or stored as literal string. Parameterized queries prevent injection. No data loss.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-062 (Security)**:
  * *Description:* Large payload rejection
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `notes` field containing 100KB of data.
  * *Expected Output:* HTTP 413 Payload Too Large or HTTP 400 Bad Request. Request rejected before processing.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-063 (Positive)**:
  * *Description:* Validate `stage_at_log` captures the lead's current stage at time of follow-up
  * *Input:* Lead's current stage is "Meeting Scheduled". Create a follow-up. Then lead's stage changes to "Proposal Sent". Create another follow-up.
  * *Expected Output:* First follow-up has `stage_at_log: "Meeting Scheduled"`. Second follow-up has `stage_at_log: "Proposal Sent"`. Each follow-up captures a snapshot of lead stage at that moment.
  * *Traceability:* STORY-4.1.1, C1-76

* **test-ep-4.1.1-064 (Edge)**:
  * *Description:* Concurrent follow-up creation for the same lead
  * *Input:* Send 5 concurrent POST requests for the same lead with different data. All authenticated as the same ME.
  * *Expected Output:* All 5 requests succeed (HTTP 201). 5 distinct follow-up records created with unique IDs and timestamps. Lead's `proposal_value` reflects the latest `proposal_amount` among the 5 (depends on processing order).
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-065 (Edge)**:
  * *Description:* Follow-up with whitespace-only notes
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `notes = "   "` (spaces only).
  * *Expected Output:* HTTP 201 Created. Notes stored as null or trimmed to empty string (depending on business rule). Not stored as whitespace.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-066 (Edge)**:
  * *Description:* `proposal_amount` with more than 2 decimal places
  * *Input:* `POST /marketing/leads/{leadId}/followups` with `proposal_amount: 12345.6789`.
  * *Expected Output:* HTTP 201 Created. Value rounded/stored as `12345.68` (2 decimal places) per NUMERIC(12,2).
  * *Traceability:* STORY-4.1.1, AC4

* **test-ep-4.1.1-067 (Edge)**:
  * *Description:* Multiple correction notes on the same follow-up
  * *Input:* Create correction A, then correction B on the same follow-up.
  * *Expected Output:* HTTP 200 OK for both. `correction_notes` field overwrites with the latest value. Consider storing correction history if multi-correction support is needed.
  * *Traceability:* STORY-4.1.1, AC3

* **test-ep-4.1.1-068 (Positive)**:
  * *Description:* Admin can add correction note to any follow-up
  * *Input:* `POST /marketing/leads/{leadId}/followups/{followupId}/correction`. Authenticated as Admin. Follow-up was created by a different ME.
  * *Expected Output:* HTTP 200 OK. Correction applied. Admin can correct any follow-up regardless of original author.
  * *Traceability:* STORY-4.1.1, AC3

* **test-ep-4.1.1-069 (Negative)**:
  * *Description:* ME cannot add correction to another ME's follow-up
  * *Input:* `POST /marketing/leads/{leadId}/followups/{followupId}/correction`. Authenticated as `me-002`. Follow-up was created by `me-001`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "You can only correct your own follow-up records"}`. Or allow if business rule permits any ME to correct.
  * *Traceability:* STORY-4.1.1, AC3

* **test-ep-4.1.1-070 (Security)**:
  * *Description:* Verify role-based access for all follow-up endpoints
  * *Input:* Test POST (create), GET (timeline), GET (today), GET (overdue) with Marketing Executive vs Admin roles.
  * *Expected Output:* ME: Can create/read follow-ups for own leads. Admin: Can create/read follow-ups for any lead. Unauthenticated: All endpoints return 401.
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-071 (Edge)**:
  * *Description:* Response time for follow-up creation under 2 seconds
  * *Input:* `POST /marketing/leads/{leadId}/followups` with valid body. Measure response time.
  * *Expected Output:* HTTP 201 Created within 2000ms. Includes DB write + lead history write + audit log write + proposal_value update (if applicable).
  * *Traceability:* STORY-4.1.1, C1-77

* **test-ep-4.1.1-072 (Edge)**:
  * *Description:* Lead's `proposal_value` is NOT updated when proposal_amount is null/0 in subsequent follow-ups
  * *Input:* Follow-up A: `proposal_amount: 50000` → lead's proposal_value = 50000. Follow-up B: `proposal_amount: null` → lead's proposal_value should remain 50000.
  * *Expected Output:* HTTP 201 Created. Lead's proposal_value stays at 50000. Only non-null, non-zero proposal_amount values trigger the update.
  * *Traceability:* STORY-4.1.1, AC4

---

> **End of Backend API Test Cases for STORY-4.1.1** — Total: 72 test cases (API endpoints 1–5)
