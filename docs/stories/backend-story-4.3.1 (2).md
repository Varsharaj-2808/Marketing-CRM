# EPIC-4: Follow-up Management — Backend API Test Cases (STORY-4.3.1: Lead Activity Timeline)

> **Epic Goal:** Allow Marketing Executives to log follow-up activities against leads and maintain an auditable interaction history.
> **Story Goal:** As any user with lead access, I want to see a single chronological timeline combining creation, assignment, stage changes, and follow-ups so that I understand the full lead story at a glance.
> **Tech Stack:** Node.js / Express / Postgres (Supabase) / Vitest
> **Total Test Cases:** 24

---

## Table of Contents
1. [GET /marketing/leads/:id/timeline — ME Lead Timeline](#1-get-marketingleadsidtimeline--me-lead-timeline)
2. [GET /admin/leads/:id/timeline — Admin Lead Timeline](#2-get-adminleadsidtimeline--admin-lead-timeline)
3. [Timeline Immutability (PUT/PATCH/DELETE Rejections)](#3-timeline-immutability-putpatchdelete-rejections)
4. [Cross-Cutting Security, Input Sanitization & Performance](#4-cross-cutting-security-input-sanitization--performance)

---

## 1. GET /marketing/leads/:id/timeline — ME Lead Timeline

**Test ID**
test-ep-4.3.1-b-001

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that a Marketing Executive can fetch a single consolidated, chronological timeline combining creation, assignments, stage changes, and follow-up activities for an assigned lead.

**Preconditions**
1. User logged in as ME `me-001`.
2. Database has Lead A assigned to `me-001` with:
   - Creation log: `2026-07-01T09:00:00Z` by `admin-001`.
   - Assignment log: `2026-07-01T09:05:00Z` to `me-001` by `admin-001`.
   - Stage Change: `2026-07-02T10:00:00Z` (New → Contacted) by `me-001`.
   - Follow-up logged: `2026-07-03T11:00:00Z` (Call - Interested) by `me-001`.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline` with Bearer token for `me-001`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Response payload returns `success: true`.
3. The `timeline` array contains exactly 4 events.
4. Events are sorted in descending chronological order:
   - Event 1: Follow-up (`2026-07-03T11:00:00Z`)
   - Event 2: Stage Change (`2026-07-02T10:00:00Z`)
   - Event 3: Assignment (`2026-07-01T09:05:00Z`)
   - Event 4: Created (`2026-07-01T09:00:00Z`)
5. Each event contains: `type`, `description`, `created_at` timestamp, and `actor` metadata.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90, C1-91

---

**Test ID**
test-ep-4.3.1-b-002

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that timeline results filter correctly when applying the single event type filter chip query parameter.

**Preconditions**
1. Lead A has 4 total events (Created, Assigned, Status Change, Follow-up).

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?type=followup`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. The `timeline` array contains only the follow-up event.
3. Created, Assigned, and Stage Change events are excluded from the dataset.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90, C1-92

---

**Test ID**
test-ep-4.3.1-b-003

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that timeline results filter correctly when combining multiple type filters in the query parameters.

**Preconditions**
1. Lead A has 4 total events.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?type=followup&type=status_change`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. The returned dataset contains only follow-up and status change events.
3. Creation and assignment logs are excluded.
4. Ordering remains descending chronological.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90, C1-92

---

**Test ID**
test-ep-4.3.1-b-004

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify pagination limit boundary: initial load returns a maximum of 20 events.

**Preconditions**
1. Lead A has exactly 25 history events.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?page=1&limit=20`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. The timeline array contains exactly 20 events.
3. Pagination metadata returns `{"page":1,"totalPages":2,"totalCount":25,"hasMore":true}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90, C1-94

---

**Test ID**
test-ep-4.3.1-b-005

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify pagination second page retrieval retrieves the remaining items.

**Preconditions**
1. Lead A has exactly 25 history events.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?page=2&limit=20`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. The timeline array contains exactly 5 events.
3. Pagination metadata: `{"page":2,"totalPages":2,"totalCount":25,"hasMore":false}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90, C1-94

---

**Test ID**
test-ep-4.3.1-b-006

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that a Marketing Executive cannot query the timeline of a lead assigned to another ME.

**Preconditions**
1. User authenticated is `me-001`.
2. Lead ID belongs to a lead assigned exclusively to `me-002`.

**Input / Steps**
1. Send `GET /marketing/leads/{me-002-leadId}/timeline`.

**Expected Result**
1. Response code is HTTP 403 Forbidden.
2. Payload returns error: `{"success":false,"message":"Not authorized to view this timeline"}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**test-ep-4.3.1-b-007


**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that request for timeline with invalid lead ID format (non-UUID) is rejected with 400 Bad Request.

**Preconditions**
1. ME logged in.

**Input / Steps**
1. Send `GET /marketing/leads/invalid-uuid-format/timeline`.

**Expected Result**
1. Response code is HTTP 400 Bad Request.
2. Response contains: `{"success":false,"message":"Invalid lead ID format"}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-b-008

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that request for timeline for a non-existent lead UUID returns 404 Not Found.

**Preconditions**
1. ME logged in.
2. Query UUID is valid format but does not exist in DB.

**Input / Steps**
1. Send `GET /marketing/leads/d3b07384-0000-0000-0000-b8448fb8b801/timeline`.

**Expected Result**
1. Response code is HTTP 404 Not Found.
2. Payload: `{"success":false,"message":"Lead not found"}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-b-009

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify that today's date boundary is parsed correctly based on UTC timezone.

**Preconditions**
1. Lead has events spanning multiple days in standard ISO 8601 UTC formats.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline`.

**Expected Result**
1. All dates are returned as ISO 8601 UTC strings (e.g. `2026-07-06T12:00:00.000Z`).
2. Order is strictly determined by microsecond sorting.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

## 2. GET /admin/leads/:id/timeline — Admin Lead Timeline

**Test ID**
test-ep-4.3.1-b-010

**Category**
GET /admin/leads/:id/timeline

**Description**
Verify that Admin can view the timeline for any lead in the system, bypassing ownership limitations.

**Preconditions**
1. User logged in as Admin `admin-001`.
2. Lead is assigned to Marketing Executive `me-001`.

**Input / Steps**
1. Send `GET /admin/leads/{leadId}/timeline` with Admin bearer token.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Full chronological timeline payload is returned.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-b-011

**Category**
GET /admin/leads/:id/timeline

**Description**
Verify Admin timeline query supports type filtering.

**Preconditions**
1. Admin logged in.

**Input / Steps**
1. Send `GET /admin/leads/{leadId}/timeline?type=status_change`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Only status change events are returned.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90, C1-92

---

**Test ID**
test-ep-4.3.1-b-012

**Category**
GET /admin/leads/:id/timeline

**Description**
Verify Admin timeline query supports pagination.

**Preconditions**
1. Admin logged in.
2. Lead has 30 total events.

**Input / Steps**
1. Send `GET /admin/leads/{leadId}/timeline?page=1&limit=20`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Returns exactly 20 events.
3. Pagination data indicates `hasMore: true`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-4.3.1, C1-90, C1-94

---

## 3. Timeline Immutability (PUT/PATCH/DELETE Rejections)

**Test ID**
test-ep-4.3.1-b-013

**Category**
Timeline Immutability

**Description**
Verify that direct PUT edits on timeline event items are blocked with Method Not Allowed.

**Preconditions**
1. Target Lead has follow-up timeline activity with ID `act-uuid-999`.

**Input / Steps**
1. Send `PUT /marketing/leads/{leadId}/timeline/act-uuid-999` (or `/admin/leads/...`).

**Expected Result**
1. Response code is HTTP 405 Method Not Allowed or 403 Forbidden.
2. Payload returns: `{"success":false,"message":"Timeline events are read-only and strictly append-only."}`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-93

---

**Test ID**
test-ep-4.3.1-b-014

**Category**
Timeline Immutability

**Description**
Verify that direct PATCH edits on timeline event items are blocked.

**Preconditions**
1. Target Lead has timeline status change event with ID `status-uuid-999`.

**Input / Steps**
1. Send `PATCH /marketing/leads/{leadId}/timeline/status-uuid-999`.

**Expected Result**
1. Response code is HTTP 405 Method Not Allowed or 403 Forbidden.
2. Database record remains unchanged.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-93

---

**Test ID**
test-ep-4.3.1-b-015

**Category**
Timeline Immutability

**Description**
Verify that DELETE requests on timeline event items are blocked.

**Preconditions**
1. Lead has follow-up activity.

**Input / Steps**
1. Send `DELETE /marketing/leads/{leadId}/timeline/act-uuid-999`.

**Expected Result**
1. Response code is HTTP 405 Method Not Allowed or 403 Forbidden.
2. Database record is not deleted.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-93

---

**Test ID**
test-ep-4.3.1-b-016

**Category**
Timeline Immutability

**Description**
Verify that Admin user cannot edit or delete historic timeline events via Admin routes.

**Preconditions**
1. Admin user logged in.

**Input / Steps**
1. Send `DELETE /admin/leads/{leadId}/timeline/act-uuid-999`.
2. Send `PUT /admin/leads/{leadId}/timeline/act-uuid-999`.

**Expected Result**
1. Both requests return HTTP 405 Method Not Allowed or 403 Forbidden.
2. The audit trail remains unchanged.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.3.1, C1-93

---

## 4. Cross-Cutting Security, Input Sanitization & Performance

**Test ID**
test-ep-4.3.1-b-017

**Category**
Cross-Cutting

**Description**
Verify that XSS scripts logged in historical notes are safely handled and not processed as server-side scripts.

**Preconditions**
1. Lead has follow-up activity notes containing: `<script>alert('XSS')</script>`.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline`.

**Expected Result**
1. Response returns the exact literal string in JSON (it is up to the client/frontend to escape output).
2. The backend parses and outputs the string safely without crashes.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-b-018

**Category**
Cross-Cutting

**Description**
Verify SQL injection attempt on query filter type parameter.

**Preconditions**
1. ME logged in.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?type=followup'; DROP TABLE lead_activities; --`.

**Expected Result**
1. Response code is HTTP 400 Bad Request (invalid type filter enum value) or resolves safely as non-matching filter.
2. Tables are not dropped.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.3.1, C1-90, C1-92

---

**Test ID**
test-ep-4.3.1-b-019

**Category**
Cross-Cutting

**Description**
Verify SQL injection attempt on limit parameter.

**Preconditions**
1. ME logged in.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?limit=20; SELECT pg_sleep(5);`.

**Expected Result**
1. Request fails with HTTP 400 Bad Request or executes immediately under 200ms (ignoring the injected sleep function).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-4.3.1, C1-90, C1-94

---

**Test ID**
test-ep-4.3.1-b-020

**Category**
Cross-Cutting

**Description**
Verify query performance response latency for timeline load on extremely large histories (1000+ events).

**Preconditions**
1. Lead A has 1000 logged events.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?page=1&limit=20`.

**Expected Result**
1. Response code is HTTP 200 OK.
2. Execution delay is under 1500ms.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-94

---

**Test ID**
test-ep-4.3.1-b-021

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify timeline retrieves clean empty state for a lead shell with no activities logged yet.

**Preconditions**
1. Lead is created in database, but has no assigned history or followup activities yet.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline`.

**Expected Result**
1. Response code is 200 OK.
2. Returns an empty timeline array: `{"success": true, "data": {"lead_id": "...", "timeline": []}}`.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

**Test ID**
test-ep-4.3.1-b-022

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify pagination handles out of bound parameters gracefully.

**Preconditions**
1. Lead A exists.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?page=-1&limit=abc`.

**Expected Result**
1. Response code is 400 Bad Request.
2. Body displays validation message: `{"success":false,"message":"Invalid page or limit parameter. Must be positive integers."}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-94

---

**Test ID**
test-ep-4.3.1-b-023

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify filtering with an unsupported type value returns 400.

**Preconditions**
1. Lead A exists.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline?type=invalid-type-string`.

**Expected Result**
1. Response code is 400 Bad Request.
2. Error response: `{"success":false,"message":"Invalid type filter. Must be one or more of: created, status_change, followup, assigned"}`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-4.3.1, C1-90, C1-92

---

**Test ID**
test-ep-4.3.1-b-024

**Category**
GET /marketing/leads/:id/timeline

**Description**
Verify chronological order consistency when events share identical microsecond timestamps.

**Preconditions**
1. Two follow-up entries share identical timestamps.

**Input / Steps**
1. Send `GET /marketing/leads/{leadId}/timeline`.

**Expected Result**
1. Response returns both events sorted secondary by event UUID in a stable order.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-4.3.1, C1-90

---

> **End of Backend API Test Cases for STORY-4.3.1** — Total: 24 test cases (Sections 1–4)
