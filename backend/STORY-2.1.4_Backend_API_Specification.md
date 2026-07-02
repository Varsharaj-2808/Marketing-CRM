# EPIC-2: Lead Management — Backend API Test Cases (STORY-2.4.1: Lead Stage Management)

> **Epic Goal:** Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome.
> **Story Goal:** As a Marketing Executive, I want to update a lead's stage so that pipeline progress is accurately reflected.
> **Database ERD Design:** Supabase PostgreSQL (Leads, Users, Lead History tables)
> **Auth Context:** Marketing Executives can update stage for active (non-closed) leads assigned to them. Admin retains override capability for closed leads.
> **Total Test Cases:** 62

---

## 📋 Table of Contents
1. [API-1: PUT /marketing/leads/:id/status — Stage Transition](#1-api-1-put-marketingleadsidstatus--stage-transition)
2. [API-2: POST /marketing/leads/:id/close (Close as Lost) — Lost Reason Capture](#2-api-2-post-marketingleadsidclose-close-as-lost--lost-reason-capture)
3. [API-3: PUT /marketing/leads/:id/close (Close as Won) — Won Values Capture](#3-api-3-put-marketingleadsidclose-close-as-won--won-values-capture)
4. [API-4: POST /admin/leads/:id/reopen — Admin Reopen Override](#4-api-4-post-adminleadsidreopen--admin-reopen-override)
5. [API-5: GET /marketing/leads/:id/lead-history & GET /admin/leads/:id/lead-history — Lead History Read](#5-api-5-get-marketingleadsidlead-history--get-adminleadsidlead-history--lead-history-read)

---

## 1. API-1: PUT /marketing/leads/:id/status — Stage Transition
*Purpose: Marketing Executive updates a lead's stage. Allowed transitions are validated; skipped/illegal transitions are blocked. Won/Lost leads are locked for ME.*

* **test-ep-2.4.1-001 (Positive)**:
  * *Description:* ME transitions lead from New Lead to Contacted (valid forward transition)
  * *Input:* `PUT /marketing/leads/{id}/status` with JSON body: `{"stage":"Contacted"}`. Lead `lead-001` currently at stage `"New Lead"`, assigned to ME `EMP-00002`. Authenticated as ME `EMP-00002`.
  * *Expected Output:* HTTP 200 OK. Response returns updated lead with `stage = "Contacted"`, `status` updated accordingly. Lead history entry appended with `event_type = "Stage Changed"`, `previous_stage = "New Lead"`, `new_stage = "Contacted"`, `actor = "EMP-00002"`, `timestamp` = current UTC time.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-002 (Positive)**:
  * *Description:* ME transitions lead from Contacted to Meeting Scheduled
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Meeting Scheduled"}`. Lead at `"Contacted"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Stage updated. History entry created.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-003 (Positive)**:
  * *Description:* ME transitions lead from Meeting Scheduled to Requirement Gathering
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Requirement Gathering"}`. Lead at `"Meeting Scheduled"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-004 (Positive)**:
  * *Description:* ME transitions lead from Requirement Gathering to Proposal Sent
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Proposal Sent"}`. Lead at `"Requirement Gathering"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-005 (Positive)**:
  * *Description:* ME transitions lead from Proposal Sent to Negotiation
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Negotiation"}`. Lead at `"Proposal Sent"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-006 (Positive)**:
  * *Description:* ME transitions lead from New Lead to Hold (valid hold state)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Hold"}`. Lead at `"New Lead"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Stage updated to `"Hold"`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-061 (Positive)**:
  * *Description:* Valid forward transition from Hold to Negotiation
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Negotiation"}`. Lead at `"Hold"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Stage updated to `"Negotiation"`. History entry appended with `previous_stage = "Hold"`, `new_stage = "Negotiation"`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-007 (Positive)**:
  * *Description:* Admin transitions stage for any lead regardless of assignment
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. Lead at `"New Lead"` assigned to ME `EMP-00003`. Authenticated as Admin `EMP-00001`.
  * *Expected Output:* HTTP 200 OK. Admin can update any lead's stage.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-008 (Negative)**:
  * *Description:* Illegal transition from New Lead directly to Won (skipped stages)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Won"}`. Lead at `"New Lead"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 422 Unprocessable Entity. JSON error: `{"error": "Invalid stage transition from 'New Lead' to 'Won'. Allowed transitions: Contacted, Hold, Lost"}`. Stage unchanged. No history entry created.
  * *Traceability:* STORY-2.4.1, C1-55

* **test-ep-2.4.1-009 (Negative)**:
  * *Description:* Illegal transition from New Lead directly to Meeting Scheduled (skipped)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Meeting Scheduled"}`. Lead at `"New Lead"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 422 Unprocessable Entity. JSON error: `{"error": "Invalid stage transition from 'New Lead' to 'Meeting Scheduled'. Allowed transitions: Contacted, Hold, Lost"}`.
  * *Traceability:* STORY-2.4.1, C1-55

* **test-ep-2.4.1-010 (Negative)**:
  * *Description:* Illegal transition from Contacted directly to Won (skipped)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Won"}`. Lead at `"Contacted"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 422 Unprocessable Entity. Error lists allowed transitions from Contacted.
  * *Traceability:* STORY-2.4.1, C1-55

* **test-ep-2.4.1-011 (Negative)**:
  * *Description:* Backwards transition from Negotiation to New Lead
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"New Lead"}`. Lead at `"Negotiation"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 422 Unprocessable Entity. Backwards transitions are blocked.
  * *Traceability:* STORY-2.4.1, C1-55

* **test-ep-2.4.1-012 (Negative)**:
  * *Description:* ME attempts to update stage on a Won lead (closed lock)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. Lead at `"Won"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "This lead is closed. Contact Admin to reopen."}`. Stage unchanged.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-013 (Negative)**:
  * *Description:* ME attempts to update stage on a Lost lead (closed lock)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. Lead at `"Lost"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "This lead is closed. Contact Admin to reopen."}`.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-014 (Negative)**:
  * *Description:* Missing `stage` field in request body
  * *Input:* `PUT /marketing/leads/{id}/status` with `{}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"stage": "Stage is required"}`.
  * *Traceability:* STORY-2.4.1, C1-55

* **test-ep-2.4.1-015 (Negative)**:
  * *Description:* Invalid stage enum value
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"InvalidStage"}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"stage": "Invalid stage value. Must be one of: New Lead, Contacted, Meeting Scheduled, Requirement Gathering, Proposal Sent, Negotiation, Hold, Won, Lost"}`.
  * *Traceability:* STORY-2.4.1, C1-55

* **test-ep-2.4.1-016 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `PUT /marketing/leads/{id}/status` with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized. JSON error: `{"error": "Authentication required"}`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

* **test-ep-2.4.1-052 (Negative)**:
  * *Description:* Expired JWT token on stage transition
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. `Authorization: Bearer <expired_jwt>`. Lead at `"New Lead"` assigned to this user.
  * *Expected Output:* HTTP 401 Unauthorized. JSON error: `{"error": "Token has expired"}`. Stage unchanged. No history entry created.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

* **test-ep-2.4.1-060 (Negative)**:
  * *Description:* Malformed Authorization header value
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. `Authorization: Bearer invalidtoken`. Lead at `"New Lead"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 401 Unauthorized. JSON error: `{"error": "Invalid token format"}`. Stage unchanged.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

* **test-ep-2.4.1-017 (Negative)**:
  * *Description:* ME attempts to update a lead not assigned to them
  * *Input:* `PUT /marketing/leads/{id}/status` with valid body. Lead assigned to ME `EMP-00003`. Authenticated as ME `EMP-00004` (different user).
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Access denied. Lead not assigned to you."}`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

* **test-ep-2.4.1-018 (Negative)**:
  * *Description:* Non-existent lead ID
  * *Input:* `PUT /marketing/leads/{id}/status` with `id = "nonexistent-lead"`. Valid body. Authenticated as ME.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Lead not found"}`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

* **test-ep-2.4.1-051 (Negative)**:
  * *Description:* Non-UUID lead ID in stage transition request
  * *Input:* `PUT /marketing/leads/{id}/status` with `id = "abc-123"` (non-UUID format). Valid body `{"stage":"Contacted"}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"id": "Invalid lead ID format. Expected UUID."}` or HTTP 404 if parsed but not found.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

* **test-ep-2.4.1-019 (Edge)**:
  * *Description:* Transition to same stage (no-op)
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. Lead already at `"Contacted"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Stage unchanged. No new lead history entry created.
  * *Traceability:* STORY-2.4.1, C1-55, C1-58

* **test-ep-2.4.1-053 (Edge)**:
  * *Description:* Two concurrent ME requests update the same lead stage simultaneously
  * *Input:* ME sends two concurrent `PUT /marketing/leads/{id}/status` calls: `{"stage":"Contacted"}` and `{"stage":"Hold"}`. Lead at `"New Lead"`. Authenticated as assigned ME.
  * *Expected Output:* Both requests return HTTP 200 OK. Only one final stage is persisted (last write wins or optimistic lock resolves). Exactly one or two history entries — system must not create duplicate entries or corrupt data.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55, C1-58

* **test-ep-2.4.1-062 (Edge)**:
  * *Description:* Soft-deleted lead returns 404 for stage transition
  * *Input:* `PUT /marketing/leads/{id}/status` with `{"stage":"Contacted"}`. Lead exists in DB but has `deleted_at` timestamp set. Authenticated as assigned ME.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Lead not found"}`. Soft-deleted leads treated as not found for all operations.
  * *Traceability:* STORY-2.4.1, C1-54, C1-55

---

## 2. API-2: POST /marketing/leads/:id/close (Close as Lost) — Lost Reason Capture
*Purpose: Marketing Executive closes a lead as Lost. A mandatory Lost Reason must be provided from a valid enum set.*

* **test-ep-2.4.1-020 (Positive)**:
  * *Description:* Close lead as Lost with valid reason from any active stage
  * *Input:* `POST /marketing/leads/{id}/close` with JSON body: `{"stage":"Lost","lost_reason":"Budget"}`. Lead at `"Negotiation"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Response returns updated lead with `stage = "Lost"`, `status` updated to closed, `lost_reason = "Budget"`. Lead history entry appended with `event_type = "Stage Changed"`, `previous_stage = "Negotiation"`, `new_stage = "Lost"`, `reason = "Budget"`, `actor = "EMP-00002"`, `timestamp` = current UTC time.
  * *Traceability:* STORY-2.4.1, C1-54, C1-56, C1-58

* **test-ep-2.4.1-021 (Positive)**:
  * *Description:* Close as Lost from New Lead stage with valid reason
  * *Input:* `POST /marketing/leads/{id}/close` with `{"stage":"Lost","lost_reason":"Competitor"}`. Lead at `"New Lead"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Stage set to `"Lost"`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-56, C1-58

* **test-ep-2.4.1-022 (Positive)**:
  * *Description:* Close as Lost with each valid lost_reason enum value
  * *Input:* Repeated calls with `lost_reason` = each enum value: `"Budget"`, `"Competitor"`, `"Not Interested"`, `"No Response"`, `"Timing"`, `"Other"`. Leads at active stages. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK for each. All valid enum values accepted.
  * *Traceability:* STORY-2.4.1, C1-56

* **test-ep-2.4.1-023 (Negative)**:
  * *Description:* Close as Lost without providing lost_reason
  * *Input:* `POST /marketing/leads/{id}/close` with `{"stage":"Lost"}`. No `lost_reason` field. Lead at active stage. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"lost_reason": "Lost reason is required when stage is Lost"}`. Stage unchanged. No history entry created.
  * *Traceability:* STORY-2.4.1, C1-56

* **test-ep-2.4.1-024 (Negative)**:
  * *Description:* Close as Lost with empty lost_reason
  * *Input:* `POST /marketing/leads/{id}/close` with `{"stage":"Lost","lost_reason":""}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"lost_reason": "Lost reason cannot be empty"}`.
  * *Traceability:* STORY-2.4.1, C1-56

* **test-ep-2.4.1-025 (Negative)**:
  * *Description:* Close as Lost with invalid lost_reason enum value
  * *Input:* `POST /marketing/leads/{id}/close` with `{"stage":"Lost","lost_reason":"InvalidReason"}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"lost_reason": "Invalid lost reason. Must be one of: Budget, Competitor, Not Interested, No Response, Timing, Other"}`.
  * *Traceability:* STORY-2.4.1, C1-56

* **test-ep-2.4.1-026 (Negative)**:
  * *Description:* Close an already Lost lead again
  * *Input:* `POST /marketing/leads/{id}/close` with `{"stage":"Lost","lost_reason":"Budget"}`. Lead already at `"Lost"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "This lead is closed. Contact Admin to reopen."}`.
  * *Traceability:* STORY-2.4.1, C1-56, C1-59

* **test-ep-2.4.1-027 (Negative)**:
  * *Description:* Unauthenticated request to close as Lost
  * *Input:* `POST /marketing/leads/{id}/close` with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.4.1, C1-54, C1-56

---

## 3. API-3: PUT /marketing/leads/:id/close (Close as Won) — Won Values Capture
*Purpose: Marketing Executive closes a lead as Won. Final Deal Value and Closure Date are mandatory.*

* **test-ep-2.4.1-028 (Positive)**:
  * *Description:* Close lead as Won with valid deal value and closure date
  * *Input:* `PUT /marketing/leads/{id}/close` with JSON body: `{"stage":"Won","final_deal_value":50000,"closure_date":"2026-07-15"}`. Lead at `"Negotiation"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Response returns updated lead with `stage = "Won"`, `status` updated to closed, `final_deal_value = 50000`, `closure_date = "2026-07-15"`. Lead history entry appended with `event_type = "Stage Changed"`, `previous_stage = "Negotiation"`, `new_stage = "Won"`, `metadata` includes `final_deal_value` and `closure_date`, `actor`, `timestamp`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-57, C1-58

* **test-ep-2.4.1-029 (Positive)**:
  * *Description:* Close as Won with zero deal value (free engagement)
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":0,"closure_date":"2026-07-15"}`. Lead at `"Negotiation"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Zero deal value accepted.
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-055 (Positive)**:
  * *Description:* Close as Won with decimal deal value
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":1234.56,"closure_date":"2026-07-15"}`. Lead at `"Negotiation"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Lead updated with `final_deal_value = 1234.56`. Decimal precision preserved.
  * *Traceability:* STORY-2.4.1, C1-57, C1-58

* **test-ep-2.4.1-030 (Negative)**:
  * *Description:* Close as Won without final_deal_value
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","closure_date":"2026-07-15"}`. No `final_deal_value`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"final_deal_value": "Final deal value is required when stage is Won"}`. Stage unchanged.
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-031 (Negative)**:
  * *Description:* Close as Won without closure_date
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":50000}`. No `closure_date`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"closure_date": "Closure date is required when stage is Won"}`.
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-032 (Negative)**:
  * *Description:* Close as Won with negative deal value
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":-1000,"closure_date":"2026-07-15"}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"final_deal_value": "Final deal value must be a non-negative number"}`.
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-033 (Negative)**:
  * *Description:* Close as Won with future closure date beyond reasonable range
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":50000,"closure_date":"2099-01-01"}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"closure_date": "Closure date cannot be in the future"}` (or beyond current date + 30 days per business rules).
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-034 (Negative)**:
  * *Description:* Close as Won with invalid date format
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":50000,"closure_date":"not-a-date"}`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"closure_date": "Invalid date format. Use YYYY-MM-DD"}`.
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-054 (Negative)**:
  * *Description:* Close as Won with closure date before lead creation date
  * *Input:* `PUT /marketing/leads/{id}/close` with `{"stage":"Won","final_deal_value":50000,"closure_date":"2025-01-01"}`. Lead created at `"2026-06-01"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"closure_date": "Closure date cannot be before lead creation date"}`. Stage unchanged.
  * *Traceability:* STORY-2.4.1, C1-57

* **test-ep-2.4.1-035 (Negative)**:
  * *Description:* Close as Won from stage that is not Negotiation (blocked)
  * *Input:* `PUT /marketing/leads/{id}/close` with valid Won body. Lead at `"Contacted"`. Authenticated as assigned ME.
  * *Expected Output:* HTTP 422 Unprocessable Entity. JSON error: `{"error": "Cannot close as Won from stage 'Contacted'. Lead must be in 'Negotiation' stage."}`.
  * *Traceability:* STORY-2.4.1, C1-55, C1-57

* **test-ep-2.4.1-036 (Negative)**:
  * *Description:* Unauthenticated request to close as Won
  * *Input:* `PUT /marketing/leads/{id}/close` with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.4.1, C1-54, C1-57

---

## 4. API-4: POST /admin/leads/:id/reopen — Admin Reopen Override
*Purpose: Admin reopens a closed (Won/Lost) lead. Mandatory reason captures the context. Stage resets to Contacted.*

* **test-ep-2.4.1-037 (Positive)**:
  * *Description:* Admin reopens a Won lead with valid reason
  * *Input:* `POST /admin/leads/{id}/reopen` with JSON body: `{"reason":"Client requested re-engagement"}`. Lead at `"Won"`. Authenticated as Admin `EMP-00001`.
  * *Expected Output:* HTTP 200 OK. Response returns updated lead with `stage = "Contacted"`, `status` updated to active. Lead history entry appended with `event_type = "Lead Reopened"`, `previous_stage = "Won"`, `new_stage = "Contacted"`, `reason = "Client requested re-engagement"`, `actor = "EMP-00001"`, `timestamp` = current UTC time.
  * *Traceability:* STORY-2.4.1, C1-54, C1-59, C1-58

* **test-ep-2.4.1-038 (Positive)**:
  * *Description:* Admin reopens a Lost lead with valid reason
  * *Input:* `POST /admin/leads/{id}/reopen` with `{"reason":"New opportunity identified"}`. Lead at `"Lost"`. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Stage reset to `"Contacted"`. History appended.
  * *Traceability:* STORY-2.4.1, C1-54, C1-59, C1-58

* **test-ep-2.4.1-039 (Positive)**:
  * *Description:* Admin reopens a closed lead and ME can now update stage
  * *Input:* Admin reopens lead via `POST /admin/leads/{id}/reopen`. Then assigned ME calls `PUT /marketing/leads/{id}/status` with `{"stage":"Meeting Scheduled"}`.
  * *Expected Output:* Reopen succeeds (200). Subsequent ME stage transition succeeds (200). Lead is no longer locked.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-040 (Negative)**:
  * *Description:* Marketing Executive attempts to reopen a closed lead
  * *Input:* `POST /admin/leads/{id}/reopen` with valid body. Lead at `"Won"`. Authenticated as ME `EMP-00002`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Forbidden. Admin access required."}`.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-041 (Negative)**:
  * *Description:* Admin attempts to reopen without providing a reason
  * *Input:* `POST /admin/leads/{id}/reopen` with `{}`. Lead at `"Won"`. Authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"reason": "Reopen reason is required"}`.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-042 (Negative)**:
  * *Description:* Admin attempts to reopen with empty reason
  * *Input:* `POST /admin/leads/{id}/reopen` with `{"reason":""}`. Authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"reason": "Reopen reason cannot be empty"}`.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-059 (Negative)**:
  * *Description:* Admin reopen reason exceeds maximum length
  * *Input:* `POST /admin/leads/{id}/reopen` with `{"reason": "A... (501 characters)"}`. Lead at `"Won"`. Authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"reason": "Reopen reason must not exceed 500 characters"}`. Lead remains closed.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-043 (Negative)**:
  * *Description:* Admin attempts to reopen a lead that is not closed (already active)
  * *Input:* `POST /admin/leads/{id}/reopen` with `{"reason":"Test"}`. Lead at `"Contacted"` (active). Authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"error": "Lead is not closed. Current stage: Contacted"}`.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-058 (Negative)**:
  * *Description:* Duplicate reopen request on an already-active lead
  * *Input:* Admin reopens lead via `POST /admin/leads/{id}/reopen` with `{"reason":"Valid reason"}` → 200. Same Admin sends the same request again on the now-active lead.
  * *Expected Output:* Second request returns HTTP 400 Bad Request. JSON error: `{"error": "Lead is not closed. Current stage: Contacted"}`. Lead remains active.
  * *Traceability:* STORY-2.4.1, C1-59

* **test-ep-2.4.1-044 (Negative)**:
  * *Description:* Unauthenticated request to reopen
  * *Input:* `POST /admin/leads/{id}/reopen` with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.4.1, C1-54, C1-59

---

## 5. API-5: GET /marketing/leads/:id/lead-history & GET /admin/leads/:id/lead-history — Lead History Read
*Purpose: Returns chronological stage change events for a lead. Immutable — no edit or delete supported.*

* **test-ep-2.4.1-045 (Positive)**:
  * *Description:* ME retrieves lead history for their assigned lead
  * *Input:* `GET /marketing/leads/{id}/lead-history`. Lead has 3 prior stage transitions (New Lead → Contacted → Meeting Scheduled → Negotiation). Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Response returns JSON array of 3 history entries sorted by `timestamp` descending. Each entry contains: `event_type = "Stage Changed"`, `previous_stage`, `new_stage`, `actor` (with resolved name), `timestamp`. Most recent event first.
  * *Traceability:* STORY-2.4.1, C1-54, C1-58

* **test-ep-2.4.1-046 (Positive)**:
  * *Description:* Admin retrieves lead history for any lead
  * *Input:* `GET /admin/leads/{id}/lead-history` for any lead. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns same history data as the marketing endpoint. Admin can view history for leads assigned to any user.
  * *Traceability:* STORY-2.4.1, C1-54, C1-58

* **test-ep-2.4.1-047 (Positive)**:
  * *Description:* Lead history includes stage changed, close, and reopen events
  * *Input:* Lead has: Created → Contacted → Lost → Reopened → Contacted → Negotiation → Won. `GET /admin/leads/{id}/lead-history`. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. All 6 events returned. Include: Stage Changed events (×4), Close as Lost event, Reopen event. Each has correct `event_type`, `previous_stage`, `new_stage`, `actor`, `timestamp`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-58, C1-59

* **test-ep-2.4.1-056 (Positive)**:
  * *Description:* Lead history returns paginated response with metadata
  * *Input:* `GET /marketing/leads/{id}/lead-history?page=1&limit=20`. Lead has 55 history entries. Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Response returns `{"page":1, "limit":20, "totalPages":3, "totalEntries":55, "hasMore":true, "data":[...20 entries...]}`. Entries sorted by `timestamp` descending.
  * *Traceability:* STORY-2.4.1, C1-58

* **test-ep-2.4.1-057 (Negative)**:
  * *Description:* Lead history with invalid page parameter
  * *Input:* `GET /marketing/leads/{id}/lead-history?page=-1&limit=20`. Lead has history entries. Authenticated as assigned ME.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"page": "Page must be a positive integer"}`.
  * *Traceability:* STORY-2.4.1, C1-58

* **test-ep-2.4.1-048 (Negative)**:
  * *Description:* ME cannot retrieve history for a lead not assigned to them
  * *Input:* `GET /marketing/leads/{id}/lead-history` for lead assigned to `EMP-00003`. Authenticated as ME `EMP-00004`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Access denied. Lead not assigned to you."}`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-58

* **test-ep-2.4.1-049 (Negative)**:
  * *Description:* History immutability — no update/delete endpoint exists
  * *Input:* Attempt `PUT /marketing/leads/{id}/lead-history/{entryId}` or `DELETE /marketing/leads/{id}/lead-history/{entryId}` on an existing history entry.
  * *Expected Output:* HTTP 404 Not Found or HTTP 405 Method Not Allowed. No update/delete endpoint exists for history entries.
  * *Traceability:* STORY-2.4.1, C1-58

* **test-ep-2.4.1-050 (Edge)**:
  * *Description:* Lead history returns empty array for lead with no stage changes
  * *Input:* `GET /marketing/leads/{id}/lead-history` for a newly created lead with no stage transitions (only created). Authenticated as assigned ME.
  * *Expected Output:* HTTP 200 OK. Response returns empty JSON array `[]`.
  * *Traceability:* STORY-2.4.1, C1-54, C1-58

---

> **End of Backend API Test Cases for STORY-2.4.1** — Total: 62 test cases (API endpoints 1–5)