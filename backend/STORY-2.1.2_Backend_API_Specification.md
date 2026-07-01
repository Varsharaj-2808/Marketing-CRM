# EPIC-2: Lead Management — Backend API Test Cases (STORY-2.2.1: Saved Views & Bulk Operations)

> **Epic Goal:** Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome.
> **Story Goal:** As an Admin, I want to save filter/view configurations and perform bulk operations (select, assign, export) on leads so that I can efficiently manage large lead volumes.
> **Database ERD Design:** Supabase PostgreSQL (Leads, Users, Saved Views, Lead History tables)
> **Auth Context:** Admin role required for all endpoints in this story. Marketing Executives (ME) are explicitly denied.
> **Total Test Cases:** 77

---

## 📋 Table of Contents
1. [API-1: POST /admin/leads/saved-views — Create Saved View](#1-api-1-post-adminleadssaved-views--create-saved-view)
2. [API-2: PUT /admin/leads/saved-views/{viewId} — Update Saved View](#2-api-2-put-adminleadssaved-viewsviewid--update-saved-view)
3. [API-3: DELETE /admin/leads/saved-views/{viewId} — Delete Saved View](#3-api-3-delete-adminleadssaved-viewsviewid--delete-saved-view)
4. [API-4: POST /admin/leads/bulk-select — Bulk Select Leads](#4-api-4-post-adminleadsbulk-select--bulk-select-leads)
5. [API-5: POST /admin/leads/bulk-assign — Bulk Assign Leads](#5-api-5-post-adminleadsbulk-assign--bulk-assign-leads)
6. [API-6: POST /admin/leads/export — Bulk Export Leads](#6-api-6-post-adminleadsexport--bulk-export-leads)
7. [API-7: GET /admin/leads — Admin Lead List](#7-api-7-get-adminleads--admin-lead-list)

---

## 1. API-1: POST /admin/leads/saved-views — Create Saved View
*Purpose: Admin saves a named filter configuration for quick reuse on the Lead List screen.*

* **test-ep-2.2.1-001 (Positive)**:
  * *Description:* Create saved view with name and all filter fields
  * *Input:* `POST /admin/leads/saved-views` with JSON body:
    `{"name":"High Priority Leads","filters":{"status":"Open","priority":"High","stage":"Contacted"}}`. Authenticated as Admin `user_id = "admin-001"`.
  * *Expected Output:* HTTP 201 Created. Response returns saved view object with `id` (UUID), `name`, `filters`, `created_by`, `created_at`, `updated_at`. Filters stored as JSONB matching input exactly.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-002 (Positive)**:
  * *Description:* Create saved view with name only and no filters
  * *Input:* `POST /admin/leads/saved-views` with JSON body:
    `{"name":"All Leads","filters":{}}`. Authenticated as Admin.
  * *Expected Output:* HTTP 201 Created. Filters stored as empty JSON object `{}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-003 (Positive)**:
  * *Description:* Create saved view with partial filters (only status)
  * *Input:* `POST /admin/leads/saved-views` with JSON body:
    `{"name":"Open Leads","filters":{"status":"Open"}}`. Authenticated as Admin.
  * *Expected Output:* HTTP 201 Created. Filters contain only the `status` field.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-004 (Negative)**:
  * *Description:* Missing `name` field
  * *Input:* `POST /admin/leads/saved-views` with JSON body:
    `{"filters":{"status":"Open"}}`. Authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"name": "Name is required"}`. No record persisted.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-005 (Negative)**:
  * *Description:* Empty string `name`
  * *Input:* `POST /admin/leads/saved-views` with JSON body:
    `{"name":"","filters":{}}`. Authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"name": "Name cannot be empty"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-006 (Negative)**:
  * *Description:* Duplicate view name for same admin user
  * *Input:* Create first view with `name = "My Views"`. Then `POST /admin/leads/saved-views` with `{"name":"My Views","filters":{}}`. Authenticated as same Admin.
  * *Expected Output:* HTTP 409 Conflict. JSON error: `{"error": "A saved view with this name already exists"}`. Duplicate name scoped per user.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-007 (Negative)**:
  * *Description:* Duplicate view name allowed for different admin users
  * *Input:* Admin-A creates `name = "My Views"`. Admin-B creates `POST /admin/leads/saved-views` with `{"name":"My Views","filters":{}}`.
  * *Expected Output:* HTTP 201 Created. Duplicate names allowed across different users.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-008 (Negative)**:
  * *Description:* Unauthorized — Marketing Executive role
  * *Input:* `POST /admin/leads/saved-views` with valid body. Authenticated as Marketing Executive `user_id = "me-001"`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Forbidden. Admin access required."}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-009 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `POST /admin/leads/saved-views` with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized. JSON error: `{"error": "Authentication required"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-010 (Edge)**:
  * *Description:* Name at maximum allowed length (100 characters)
  * *Input:* `POST /admin/leads/saved-views` with `name` = 100 character string, `filters = {}`. Authenticated as Admin.
  * *Expected Output:* HTTP 201 Created.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-011 (Edge)**:
  * *Description:* Name exceeding maximum length
  * *Input:* `POST /admin/leads/saved-views` with `name` = 101 character string.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"name": "Name must be 100 characters or less"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-012 (Edge)**:
  * *Description:* Filters with unknown/extra fields
  * *Input:* `POST /admin/leads/saved-views` with `{"name":"Test","filters":{"status":"Open","unknown_field":"value"}}`.
  * *Expected Output:* HTTP 201 Created. Unknown filter keys are stored as-is in the JSONB column.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-013 (Security)**:
  * *Description:* XSS attempt in name field
  * *Input:* `POST /admin/leads/saved-views` with `name = "<script>alert('xss')</script>"`.
  * *Expected Output:* HTTP 201 Created. Name stored as-is but output is HTML-escaped when served via GET endpoints. No script execution.
  * *Traceability:* STORY-2.2.1, C1-44

---

## 2. API-2: PUT /admin/leads/saved-views/{viewId} — Update Saved View
*Purpose: Admin updates an existing saved view's name and/or filters.*

* **test-ep-2.2.1-014 (Positive)**:
  * *Description:* Update name only, filters remain unchanged
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` with JSON body:
    `{"name":"Today Follow-up"}`. View exists and is owned by the authenticated Admin. Original filters were `{"status":"Open","stage":"Contacted"}`.
  * *Expected Output:* HTTP 200 OK. `name` updated to "Today Follow-up". `filters` retain original values unchanged. `updated_at` timestamp refreshed.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-015 (Positive)**:
  * *Description:* Update filters only, name remains unchanged
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` with JSON body:
    `{"filters":{"stage":"Meeting Scheduled"}}`. Original name was "Follow-up".
  * *Expected Output:* HTTP 200 OK. `filters` updated to `{"stage":"Meeting Scheduled"}`. `name` remains "Follow-up". `updated_at` refreshed.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-016 (Positive)**:
  * *Description:* Update both name and filters
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` with JSON body:
    `{"name":"Updated View","filters":{"priority":"High"}}`.
  * *Expected Output:* HTTP 200 OK. Both `name` and `filters` updated. `updated_at` refreshed.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-017 (Negative)**:
  * *Description:* Update with empty name
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` with `{"name":""}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"name": "Name cannot be empty"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-018 (Negative)**:
  * *Description:* Update with no fields provided
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` with `{}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"error": "At least one field (name or filters) must be provided"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-019 (Negative)**:
  * *Description:* Non-existent viewId
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` where `viewId` is a valid UUID not present in database.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Saved view not found"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-020 (Negative)**:
  * *Description:* Invalid viewId format
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` where `viewId = "not-a-uuid"`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"error": "Invalid view ID format"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-021 (Negative)**:
  * *Description:* Update another admin's saved view (IDOR prevention)
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` where the view is owned by a different Admin. Authenticated as Admin-A.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "You do not have permission to modify this saved view"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-022 (Negative)**:
  * *Description:* Unauthorized — Marketing Executive role
  * *Input:* `PUT /admin/leads/saved-views/{viewId}` with valid body. Authenticated as ME.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Forbidden. Admin access required."}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-023 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `PUT /admin/leads/saved-views/{viewId}`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-024 (Edge)**:
  * *Description:* Update duplicate name (same user, different view)
  * *Input:* View-A named "Priority", View-B named "Follow-up". Update View-B with `{"name":"Priority"}`.
  * *Expected Output:* HTTP 409 Conflict. JSON error: `{"error": "A saved view with this name already exists"}`.
  * *Traceability:* STORY-2.2.1, C1-44

---

## 3. API-3: DELETE /admin/leads/saved-views/{viewId} — Delete Saved View
*Purpose: Admin permanently removes a saved view.*

* **test-ep-2.2.1-025 (Positive)**:
  * *Description:* Delete existing saved view owned by the requesting admin
  * *Input:* `DELETE /admin/leads/saved-views/{viewId}` where view exists and is owned by the authenticated Admin.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"message": "Deleted"}`. Row removed from saved_views table.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-026 (Negative)**:
  * *Description:* Delete non-existent viewId
  * *Input:* `DELETE /admin/leads/saved-views/{viewId}` where `viewId` is a valid UUID not in database.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Saved view not found"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-027 (Negative)**:
  * *Description:* Invalid viewId format
  * *Input:* `DELETE /admin/leads/saved-views/{viewId}` where `viewId = "bad-id"`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"error": "Invalid view ID format"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-028 (Negative)**:
  * *Description:* Delete another admin's saved view (IDOR prevention)
  * *Input:* `DELETE /admin/leads/saved-views/{viewId}` where view is owned by a different Admin.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "You do not have permission to delete this saved view"}`.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-029 (Negative)**:
  * *Description:* Unauthorized — Marketing Executive role
  * *Input:* `DELETE /admin/leads/saved-views/{viewId}`. Authenticated as ME.
  * *Expected Output:* HTTP 403 Forbidden.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-030 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `DELETE /admin/leads/saved-views/{viewId}`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.2.1, C1-44

* **test-ep-2.2.1-031 (Edge)**:
  * *Description:* Delete already-deleted view (idempotency)
  * *Input:* Delete same viewId twice.
  * *Expected Output:* First call: HTTP 200 OK. Second call: HTTP 404 Not Found (resource no longer exists).
  * *Traceability:* STORY-2.2.1, C1-44

---

## 4. API-4: POST /admin/leads/bulk-select — Bulk Select Leads
*Purpose: Admin selects a set of lead IDs for subsequent bulk operations. This endpoint validates that the provided lead IDs exist and are accessible.*

* **test-ep-2.2.1-032 (Positive)**:
  * *Description:* Select multiple valid lead IDs
  * *Input:* `POST /admin/leads/bulk-select` with JSON body:
    `{"lead_ids":["lead-001","lead-002"]}`. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"selected":true,"count":2,"lead_ids":["lead-001","lead-002"]}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-033 (Positive)**:
  * *Description:* Select empty array (no leads)
  * *Input:* `POST /admin/leads/bulk-select` with `{"lead_ids":[]}`.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"selected":true,"count":0,"lead_ids":[]}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-034 (Positive)**:
  * *Description:* Select single lead ID
  * *Input:* `POST /admin/leads/bulk-select` with `{"lead_ids":["lead-001"]}`.
  * *Expected Output:* HTTP 200 OK. JSON response with `count: 1`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-035 (Negative)**:
  * *Description:* `lead_ids` is not an array
  * *Input:* `POST /admin/leads/bulk-select` with `{"lead_ids":"lead-001"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"lead_ids": "Must be an array of lead ID strings"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-036 (Negative)**:
  * *Description:* `lead_ids` contains non-string entries
  * *Input:* `POST /admin/leads/bulk-select` with `{"lead_ids":[123, true, null]}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"lead_ids": "Each lead ID must be a string"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-037 (Negative)**:
  * *Description:* Unauthorized — Marketing Executive role
  * *Input:* `POST /admin/leads/bulk-select` with valid body. Authenticated as ME.
  * *Expected Output:* HTTP 403 Forbidden.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-038 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `POST /admin/leads/bulk-select`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-039 (Edge)**:
  * *Description:* Duplicate lead IDs in the array
  * *Input:* `POST /admin/leads/bulk-select` with `{"lead_ids":["lead-001","lead-001","lead-002"]}`.
  * *Expected Output:* HTTP 200 OK. Array is deduplicated. `count: 2`. `lead_ids` returned without duplicates.
  * *Traceability:* STORY-2.2.1, C1-45

---

## 5. API-5: POST /admin/leads/bulk-assign — Bulk Assign Leads
*Purpose: Admin reassigns ownership of multiple leads to another user in a single operation.*

* **test-ep-2.2.1-040 (Positive)**:
  * *Description:* Assign multiple leads to a valid active user
  * *Input:* `POST /admin/leads/bulk-assign` with JSON body:
    `{"lead_ids":["lead-001","lead-002"],"assigned_to":"user-101"}`. Authenticated as Admin. `user-101` is an active Marketing Executive.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"assigned":true,"count":2}`. Both leads updated in DB with `assigned_to = "user-101"`. Lead history entries created for each lead recording the reassignment.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-041 (Positive)**:
  * *Description:* Assign with a reason field
  * *Input:* `POST /admin/leads/bulk-assign` with JSON body:
    `{"lead_ids":["lead-001"],"assigned_to":"user-101","reason":"Region reassignment"}`.
  * *Expected Output:* HTTP 200 OK. Lead history entry contains `change_summary` including the reason text.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-042 (Positive)**:
  * *Description:* Assign single lead
  * *Input:* `POST /admin/leads/bulk-assign` with `{"lead_ids":["lead-001"],"assigned_to":"user-101"}`.
  * *Expected Output:* HTTP 200 OK. `count: 1`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-043 (Positive)**:
  * *Description:* Admin assigns lead to themselves
  * *Input:* `POST /admin/leads/bulk-assign` with `assigned_to` = own Admin user ID.
  * *Expected Output:* HTTP 200 OK. Lead reassigned to the admin.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-044 (Negative)**:
  * *Description:* Empty `lead_ids` array
  * *Input:* `POST /admin/leads/bulk-assign` with `{"lead_ids":[],"assigned_to":"user-101"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"lead_ids": "At least one lead ID is required"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-045 (Negative)**:
  * *Description:* Missing `assigned_to` field
  * *Input:* `POST /admin/leads/bulk-assign` with `{"lead_ids":["lead-001"]}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"assigned_to": "Target user ID is required"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-046 (Negative)**:
  * *Description:* Non-existent `assigned_to` user
  * *Input:* `POST /admin/leads/bulk-assign` with `{"lead_ids":["lead-001"],"assigned_to":"nonexistent-user"}`.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Assigned user not found"}`. No leads updated.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-047 (Negative)**:
  * *Description:* Deactivated/inactive user as assignee
  * *Input:* `POST /admin/leads/bulk-assign` where `assigned_to` points to a user with `status = "Inactive"`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"error": "Cannot assign leads to a deactivated user"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-048 (Negative)**:
  * *Description:* One or more lead IDs do not exist (partial failure)
  * *Input:* `POST /admin/leads/bulk-assign` with `{"lead_ids":["lead-001","nonexistent-lead"],"assigned_to":"user-101"}`.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Lead(s) not found: nonexistent-lead"}`. Transaction rolled back — no leads updated.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-049 (Negative)**:
  * *Description:* Unauthorized — Marketing Executive role
  * *Input:* `POST /admin/leads/bulk-assign` with valid body. Authenticated as ME.
  * *Expected Output:* HTTP 403 Forbidden.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-050 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `POST /admin/leads/bulk-assign`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-051 (Edge)**:
  * *Description:* Large batch assignment (1000+ leads)
  * *Input:* `POST /admin/leads/bulk-assign` with 1000 valid lead IDs and a valid `assigned_to`.
  * *Expected Output:* HTTP 200 OK (or HTTP 413 Payload Too Large if size limit enforced per design). All leads updated if accepted.
  * *Traceability:* STORY-2.2.1, C1-45

---

## 6. API-6: POST /admin/leads/export — Bulk Export Leads
*Purpose: Admin exports selected leads to a downloadable file (xlsx or csv format).*

* **test-ep-2.2.1-052 (Positive)**:
  * *Description:* Export selected leads to xlsx format
  * *Input:* `POST /admin/leads/export` with JSON body:
    `{"lead_ids":["lead-001","lead-002"],"format":"xlsx"}`. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"download_url": "/exports/leads-2026-07-01-abc123.xlsx"}`. File generated on server with correct `.xlsx` extension.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-053 (Positive)**:
  * *Description:* Export selected leads to csv format
  * *Input:* `POST /admin/leads/export` with `{"lead_ids":["lead-001","lead-002"],"format":"csv"}`.
  * *Expected Output:* HTTP 200 OK. JSON response with `download_url` pointing to a `.csv` file.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-054 (Positive)**:
  * *Description:* Export all leads (empty lead_ids array)
  * *Input:* `POST /admin/leads/export` with `{"lead_ids":[],"format":"xlsx"}`.
  * *Expected Output:* HTTP 200 OK. All leads in the system exported. Response includes `download_url`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-055 (Negative)**:
  * *Description:* Invalid format specified
  * *Input:* `POST /admin/leads/export` with `{"lead_ids":["lead-001"],"format":"pdf"}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"format": "Format must be 'xlsx' or 'csv'"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-056 (Negative)**:
  * *Description:* Missing `format` field
  * *Input:* `POST /admin/leads/export` with `{"lead_ids":["lead-001"]}`.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"format": "Export format is required"}`.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-057 (Negative)**:
  * *Description:* Non-existent lead IDs in selection
  * *Input:* `POST /admin/leads/export` with `{"lead_ids":["lead-001","nonexistent-lead"],"format":"xlsx"}`.
  * *Expected Output:* HTTP 404 Not Found. JSON error: `{"error": "Lead(s) not found: nonexistent-lead"}`. No export file generated.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-058 (Negative)**:
  * *Description:* Unauthorized — Marketing Executive role
  * *Input:* `POST /admin/leads/export` with valid body. Authenticated as ME.
  * *Expected Output:* HTTP 403 Forbidden.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-059 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `POST /admin/leads/export`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-060 (Edge)**:
  * *Description:* Downloaded file is accessible and has correct headers
  * *Input:* Fetch the `download_url` returned from a successful export.
  * *Expected Output:* HTTP 200 OK. Response has `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (for xlsx) or `text/csv` (for csv). `Content-Disposition: attachment; filename="leads-...."`. File is not empty.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-061 (Edge)**:
  * *Description:* Export with large dataset (10,000+ leads)
  * *Input:* `POST /admin/leads/export` with large lead_ids array or empty array (all leads).
  * *Expected Output:* HTTP 200 OK with download URL. Server handles streaming/large file generation without timeout.
  * *Traceability:* STORY-2.2.1, C1-45

* **test-ep-2.2.1-062 (Edge)**:
  * *Description:* Export file includes correct columns
  * *Input:* Export leads to csv. Open downloaded file.
  * *Expected Output:* CSV headers include: Lead ID, Company Name, Contact Person, Mobile, Email, Lead Source, Category, Priority, Stage, Estimated Value, Assigned To, Created At, Updated At.
  * *Traceability:* STORY-2.2.1, C1-45

---

## 7. API-7: GET /admin/leads — Admin Lead List
*Purpose: Admin retrieves paginated lead list with search, sort, and filter capabilities. Returns all leads across all owners (unlike GET /marketing/leads which scopes to the authenticated ME).*

* **test-ep-2.2.1-063 (Positive)**:
  * *Description:* Admin retrieves all leads without filters
  * *Input:* `GET /admin/leads` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns JSON array of all leads in the system across all assigned users. Response includes pagination metadata: `{"page": 1, "totalPages": 3, "totalCount": 65, "limit": 25, "data": [...]}`.
  * *Traceability:* STORY-2.2.1, C1-40

* **test-ep-2.2.1-064 (Positive)**:
  * *Description:* Admin sees leads owned by all Marketing Executives
  * *Input:* `GET /admin/leads` authenticated as Admin. Database has leads assigned to ME-A, ME-B, and unassigned leads.
  * *Expected Output:* HTTP 200 OK. Response includes leads from all owners (ME-A, ME-B, and unassigned). No row-level filtering applied to Admin role.
  * *Traceability:* STORY-2.2.1, C1-40

* **test-ep-2.2.1-065 (Positive)**:
  * *Description:* Search leads by company name text
  * *Input:* `GET /admin/leads?search=Supabase` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns leads where `company_name` contains "Supabase" (case-insensitive). If search also covers `contact_person`, `mobile`, and `lead_id`, those matches are included too.
  * *Traceability:* STORY-2.2.1, C1-43

* **test-ep-2.2.1-066 (Positive)**:
  * *Description:* Filter leads by status, priority, and stage
  * *Input:* `GET /admin/leads?status=Open&priority=High&stage=Contacted` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns only leads where `status = "Open"` AND `priority = "High"` AND `stage = "Contacted"`. Filters are combined with AND logic.
  * *Traceability:* STORY-2.2.1, C1-42

* **test-ep-2.2.1-067 (Positive)**:
  * *Description:* Filter leads by source, category, and assigned_to
  * *Input:* `GET /admin/leads?source=Website&category=IT%20Services&assigned_to=user-101` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns leads matching all three filter criteria. Filter parameters are URL-decoded correctly.
  * *Traceability:* STORY-2.2.1, C1-42

* **test-ep-2.2.1-068 (Positive)**:
  * *Description:* Sort leads by estimated value descending
  * *Input:* `GET /admin/leads?sortBy=estimated_value&sortOrder=desc` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns leads sorted with highest estimated values first.
  * *Traceability:* STORY-2.2.1, C1-41

* **test-ep-2.2.1-069 (Positive)**:
  * *Description:* Sort leads by created date ascending
  * *Input:* `GET /admin/leads?sortBy=created_at&sortOrder=asc` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns leads sorted with oldest creation dates first.
  * *Traceability:* STORY-2.2.1, C1-41

* **test-ep-2.2.1-070 (Positive)**:
  * *Description:* Sort leads by priority (enum order) and status
  * *Input:* `GET /admin/leads?sortBy=priority&sortOrder=desc` and `GET /admin/leads?sortBy=status&sortOrder=asc` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Priority sorted in defined enum order (Hot > Warm > Cold). Status sorted alphabetically.
  * *Traceability:* STORY-2.2.1, C1-41

* **test-ep-2.2.1-071 (Positive)**:
  * *Description:* Paginated leads retrieval — page 2 with custom limit
  * *Input:* `GET /admin/leads?page=2&limit=10` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns leads 11–20. Pagination metadata: `{"page": 2, "totalPages": 7, "totalCount": 65, "limit": 10, "data": [...]}`.
  * *Traceability:* STORY-2.2.1, C1-39

* **test-ep-2.2.1-072 (Negative)**:
  * *Description:* Marketing Executive cannot access admin leads endpoint
  * *Input:* `GET /admin/leads` authenticated as Marketing Executive.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Forbidden. Admin access required."}`.
  * *Traceability:* STORY-2.2.1, C1-40

* **test-ep-2.2.1-073 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* `GET /admin/leads`. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-2.2.1, C1-40

* **test-ep-2.2.1-074 (Edge)**:
  * *Description:* Empty results with no matching leads
  * *Input:* `GET /admin/leads?search=NonExistentCompanyXYZ` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Response with empty data array. `{"page": 1, "totalPages": 0, "totalCount": 0, "limit": 25, "data": []}`.
  * *Traceability:* STORY-2.2.1, C1-43

* **test-ep-2.2.1-075 (Edge)**:
  * *Description:* Combined search, filter, sort, and pagination
  * *Input:* `GET /admin/leads?search=Tech&status=Open&sortBy=created_at&sortOrder=desc&page=1&limit=10` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns page 1 of up to 10 leads matching "Tech" in search fields AND status "Open", sorted by newest first. All parameters interact correctly.
  * *Traceability:* STORY-2.2.1, C1-39, C1-41, C1-42, C1-43

* **test-ep-2.2.1-076 (Edge)**:
  * *Description:* Invalid page number (negative or zero)
  * *Input:* `GET /admin/leads?page=0` and `GET /admin/leads?page=-1` authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"page": "Page must be a positive integer"}`.
  * *Traceability:* STORY-2.2.1, C1-39

* **test-ep-2.2.1-077 (Edge)**:
  * *Description:* Invalid sort field
  * *Input:* `GET /admin/leads?sortBy=invalid_field` authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: `{"sortBy": "Invalid sort field. Must be one of: company_name, contact_person, priority, status, stage, estimated_value, created_at"}`.
  * *Traceability:* STORY-2.2.1, C1-41

* **test-ep-2.2.1-078 (Positive)**:
  * *Description:* Filter leads by created date range
  * *Input:* `GET /admin/leads?from_date=2026-01-01&to_date=2026-01-31` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns only leads whose `created_at` falls between `2026-01-01` and `2026-01-31` (inclusive). Pagination metadata is returned as normal.
  * *Traceability:* STORY-2.2.1, C1-42

* **test-ep-2.2.1-079 (Negative)**:
  * *Description:* Invalid date range (from_date greater than to_date)
  * *Input:* `GET /admin/leads?from_date=2026-02-01&to_date=2026-01-01` authenticated as Admin.
  * *Expected Output:* HTTP 400 Bad Request. JSON error:
    `{"from_date":"from_date cannot be greater than to_date"}`.
  * *Traceability:* STORY-2.2.1, C1-42

---

> **End of Backend API Test Cases for STORY-2.2.1** — Total: 79 test cases (API endpoints 1–7)
