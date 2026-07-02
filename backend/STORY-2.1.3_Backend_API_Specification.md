# EPIC-2: Lead Management — Backend API Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)

> **Epic Goal:** Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome.
> **Story Goal:** As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear.
> **Database ERD Design:** Supabase PostgreSQL (Leads, Users, Lead History, Notifications tables)
> **Auth Context:** Admin role required for assign/reassign actions. Marketing Executives (ME) are explicitly denied.
> **Total Test Cases:** 51

---

## 📋 Table of Contents
1. [API-1: PATCH /leads/{id}/assign — Single Lead Assign/Reassign](#1-api-1-patch-leadsidassign--single-lead-assignreassign)
2. [API-2: Lead History — Assignment-Changed Event Recording](#2-api-2-lead-history--assignment-changed-event-recording)
3. [API-3: Notification — Trigger to New Owner](#3-api-3-notification--trigger-to-new-owner)
4. [API-4: POST /admin/leads/bulk-assign — Bulk Assign (Story 2.3.1 Specific)](#4-api-4-post-adminleadsbulk-assign--bulk-assign-story-231-specific)
5. [API-5: GET /admin/users?role=Marketing Executive — User List for Assignee Dropdown](#5-api-5-get-adminusersrolemarketing-executive--user-list-for-assignee-dropdown)

---

## 1. API-1: PATCH /admin/leads/{id}/assign — Single Lead Assign/Reassign
*Purpose: Admin assigns a lead to a Marketing Executive or reassigns from one ME to another. Reassignment reason is mandatory when the lead already has an owner.*
> **Route:** `PATCH /api/admin/leads/{id}/assign` (moved from `/api/marketing/leads/{id}/assign`)

* **test-ep-2.3.1-001 (Positive)**:
  * *Description:* Assign an unowned lead to an active Marketing Executive
  * *Input:* `PATCH /leads/{id}/assign` with JSON body: `{"assigned_to":"EMP-00002"}`. Lead `lead-001` has `assigned_to = null`. Authenticated as Admin `employee_id = "EMP-00001"`.
  * *Expected Output:* HTTP 200 OK. Response returns updated lead object with `assigned_to = "EMP-00002"` and `assigned_at` timestamp set to current UTC time. Lead history records event with `event_type = "Assigned/Reassigned"`, `previous_owner = null`, `new_owner = "EMP-00002"`, `actor = "EMP-00001"`, `reason = null`.
  * *Traceability:* STORY-2.3.1, C1-48, C1-50
* **test-ep-2.3.1-002 (Positive)**:
  * *Description:* Reassign a lead that already has an owner, providing valid reason
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00003","reason":"Region reallocation"}. Lead lead-001 currently assigned to EMP-00002. Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. ssigned_to updated to "EMP-00003". ssigned_at refreshed. Reason accepted and stored in lead history.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49, C1-50

* **test-ep-2.3.1-003 (Positive)**:
  * *Description:* Admin assigns lead to themselves
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00001"}. Authenticated as Admin EMP-00001.
  * *Expected Output:* HTTP 200 OK. Lead assigned to the Admin user. Lead history records the assignment.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-004 (Positive)**:
  * *Description:* Initial assignment of newly created lead (no previous owner) does not require reason
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00002"}. Lead has ssigned_to = null. No eason field in request body.
  * *Expected Output:* HTTP 200 OK. Assignment succeeds without reason. Lead history records previous_owner = null, 
ew_owner = "EMP-00002".
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

* **test-ep-2.3.1-005 (Positive)**:
  * *Description:* Reassignment with minimum length reason (single character)
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00003","reason":"R"}. Lead currently assigned.
  * *Expected Output:* HTTP 200 OK. Reason accepted.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

* **test-ep-2.3.1-006 (Negative)**:
  * *Description:* Reassign without reason when lead already has an owner
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00003"}. Lead currently assigned to EMP-00002. No eason field provided.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"reason": "Reassignment reason is required when the lead already has an owner"}. Lead ownership unchanged.
  * *Traceability:* STORY-2.3.1, C1-49

* **test-ep-2.3.1-007 (Negative)**:
  * *Description:* Reassign with empty reason string when lead has owner
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00003","reason":""}. Lead currently assigned.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"reason": "Reassignment reason cannot be empty"}.
  * *Traceability:* STORY-2.3.1, C1-49

* **test-ep-2.3.1-008 (Negative)**:
  * *Description:* Reassign with whitespace-only reason
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":"EMP-00003","reason":"   "}. Lead currently assigned.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"reason": "Reassignment reason cannot be empty"}.
  * *Traceability:* STORY-2.3.1, C1-49

* **test-ep-2.3.1-009 (Negative)**:
  * *Description:* Missing ssigned_to field
  * *Input:* PATCH /leads/{id}/assign with JSON body: {} or {"reason":"Test reason"}.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"assigned_to": "Target user ID is required"}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-010 (Negative)**:
  * *Description:* Empty ssigned_to string
  * *Input:* PATCH /leads/{id}/assign with JSON body: {"assigned_to":""}.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"assigned_to": "Target user ID is required"}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-011 (Negative)**:
  * *Description:* Non-existent lead ID
  * *Input:* PATCH /leads/{id}/assign with id = "nonexistent-lead". Valid body {"assigned_to":"EMP-00002"}. Authenticated as Admin.
  * *Expected Output:* HTTP 404 Not Found. JSON error: {"error": "Lead not found"}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-012 (Negative)**:
  * *Description:* Non-existent user as assignee
  * *Input:* PATCH /leads/{id}/assign with {"assigned_to":"EMP-99999"}. Lead exists. Authenticated as Admin.
  * *Expected Output:* HTTP 404 Not Found. JSON error: {"error": "Assigned user not found"}. Lead unchanged.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-013 (Negative)**:
  * *Description:* Inactive/deactivated user as assignee
  * *Input:* PATCH /leads/{id}/assign where ssigned_to points to a user with status = "Inactive". Lead exists.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"error": "Cannot assign leads to a deactivated user"}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-014 (Negative)**:
  * *Description:* Marketing Executive attempts to access assign endpoint
  * *Input:* PATCH /leads/{id}/assign with valid body. Authenticated as Marketing Executive employee_id = "EMP-00004".
  * *Expected Output:* HTTP 403 Forbidden. JSON error: {"error": "Forbidden. Admin access required."}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-015 (Negative)**:
  * *Description:* Unauthenticated request
  * *Input:* PATCH /leads/{id}/assign with valid body. No Authorization header.
  * *Expected Output:* HTTP 401 Unauthorized. JSON error: {"error": "Authentication required"}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-016 (Negative)**:
  * *Description:* Invalid lead ID format (non-UUID)
  * *Input:* PATCH /leads/{id}/assign with id = "not-a-valid-id".
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"error": "Invalid lead ID format"}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-017 (Edge)**:
  * *Description:* Assign lead to the same user it is already assigned to (no-op)
  * *Input:* PATCH /leads/{id}/assign with {"assigned_to":"EMP-00002"}. Lead already assigned to EMP-00002.
  * *Expected Output:* HTTP 200 OK. Lead ownership unchanged. ssigned_at timestamp may or may not refresh (per design). No new lead history entry created for no-op assignment.
  * *Traceability:* STORY-2.3.1, C1-48, C1-51

* **test-ep-2.3.1-018 (Edge)**:
  * *Description:* Reassign with reason at maximum allowed length (500 characters)
  * *Input:* PATCH /leads/{id}/assign with eason = 500 character string. Lead currently assigned.
  * *Expected Output:* HTTP 200 OK. Reason stored in lead history.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

* **test-ep-2.3.1-019 (Edge)**:
  * *Description:* Reassign with reason exceeding maximum length
  * *Input:* PATCH /leads/{id}/assign with eason = 501 character string.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"reason": "Reason must be 500 characters or less"}.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

* **test-ep-2.3.1-020 (Edge)**:
  * *Description:* Reassign with special characters and Unicode in reason
  * *Input:* PATCH /leads/{id}/assign with eason = "Réassignment — région: test".
  * *Expected Output:* HTTP 200 OK. Unicode and special characters stored correctly in lead history.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

* **test-ep-2.3.1-021 (Edge)**:
  * *Description:* XSS attempt in reason field
  * *Input:* PATCH /leads/{id}/assign with eason = "<script>alert('xss')</script>".
  * *Expected Output:* HTTP 200 OK. Reason stored as-is but HTML-escaped when served via API responses. No script execution.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

---

## 2. API-2: Lead History — Assignment-Changed Event Recording
*Purpose: Every assignment or reassignment creates an immutable entry in Lead History recording previous owner, new owner, reason, actor, and timestamp.*

* **test-ep-2.3.1-022 (Positive)**:
  * *Description:* History entry created on initial assignment (no previous owner)
  * *Input:* Assign lead lead-001 (unowned) to EMP-00002. PATCH /leads/{id}/assign with {"assigned_to":"EMP-00002"}.
  * *Expected Output:* Lead history table contains entry with: event_type = "Assigned/Reassigned", previous_owner = null, 
ew_owner = "EMP-00002", ctor = "EMP-00001" (Admin), eason = null, 	imestamp = current UTC time.
  * *Traceability:* STORY-2.3.1, C1-51

* **test-ep-2.3.1-023 (Positive)**:
  * *Description:* History entry created on reassignment with all fields populated
  * *Input:* PATCH /leads/{id}/assign with {"assigned_to":"EMP-00003","reason":"Workload balancing"}. Lead previously assigned to EMP-00002.
  * *Expected Output:* Lead history entry has: previous_owner = "EMP-00002", 
ew_owner = "EMP-00003", eason = "Workload balancing", ctor = "EMP-00001", 	imestamp = current UTC time. Entry is append-only and immutable.
  * *Traceability:* STORY-2.3.1, C1-51

* **test-ep-2.3.1-024 (Positive)**:
  * *Description:* Multiple reassignments create sequential history entries
  * *Input:* Reassign lead lead-001 from 
ull to EMP-00002, then from EMP-00002 to EMP-00003 (with reason), then from EMP-00003 to EMP-00004 (with reason).
  * *Expected Output:* Three distinct history entries exist for lead-001. First: 
ull -> EMP-00002. Second: EMP-00002 -> EMP-00003. Third: EMP-00003 -> EMP-00004. Each has its own actor, reason, and timestamp.
  * *Traceability:* STORY-2.3.1, C1-51

* **test-ep-2.3.1-025 (Positive)**:
  * *Description:* History entries are returned in chronological order via timeline endpoint
  * *Input:* GET /leads/{id}/timeline with ilter=Assignment. Lead has multiple assignment history entries.
  * *Expected Output:* HTTP 200 OK. Assignment events sorted by timestamp descending. Each entry shows: previous_owner, 
ew_owner, eason, ctor, 	imestamp. Actor display name is resolved.
  * *Traceability:* STORY-2.3.1, C1-51, C1-90

* **test-ep-2.3.1-026 (Negative)**:
  * *Description:* History entry immutability — no API endpoint exists to update or delete history
  * *Input:* Attempt PUT /leads/{id}/history/{historyId} or DELETE /leads/{id}/history/{historyId} on an existing assignment history entry.
  * *Expected Output:* HTTP 404 Not Found or HTTP 405 Method Not Allowed. No update/delete endpoint exists for history entries.
  * *Traceability:* STORY-2.3.1, C1-51

* **test-ep-2.3.1-027 (Negative)**:
  * *Description:* No history entry created when no-op assignment (same owner)
  * *Input:* PATCH /leads/{id}/assign with {"assigned_to":"EMP-00002"}. Lead already assigned to EMP-00002.
  * *Expected Output:* HTTP 200 OK. No new lead history entry is created for lead-001. Total history count unchanged.
  * *Traceability:* STORY-2.3.1, C1-48, C1-51

* **test-ep-2.3.1-028 (Security)**:
  * *Description:* Non-admin cannot view lead history for arbitrary leads
  * *Input:* GET /leads/{id}/timeline authenticated as ME EMP-00004 for a lead assigned to EMP-00005 (not the requesting user).
  * *Expected Output:* HTTP 403 Forbidden. JSON error: {"error": "Access denied. Lead not assigned to you."}.
  * *Traceability:* STORY-2.3.1, C1-51, C1-90

---

## 3. API-3: Notification — Trigger to New Owner
*Purpose: When a lead is assigned or reassigned, the new owner receives an in-app notification. Assignment succeeds regardless of notification delivery status.*

* **test-ep-2.3.1-029 (Positive)**:
  * *Description:* In-app notification created for new owner on assignment
  * *Input:* PATCH /leads/{id}/assign with {"assigned_to":"EMP-00002"}. Lead assigned to EMP-00002.
  * *Expected Output:* HTTP 200 OK. A notification record is created for user EMP-00002. Notification contains: 
otification_type = "lead_assigned", lead_id referencing the lead, message (e.g., "Lead LD-2026-00042 has been assigned to you"), is_read = false, created_at = current UTC timestamp.
  * *Traceability:* STORY-2.3.1, C1-52

* **test-ep-2.3.1-030 (Positive)**:
  * *Description:* In-app notification created for new owner on reassignment
  * *Input:* PATCH /leads/{id}/assign with {"assigned_to":"EMP-00003","reason":"Team restructuring"}. Lead reassigned from EMP-00002 to EMP-00003.
  * *Expected Output:* HTTP 200 OK. Notification created for EMP-00003. Message reflects reassignment context (e.g., "Lead LD-2026-00042 has been reassigned to you").
  * *Traceability:* STORY-2.3.1, C1-52

* **test-ep-2.3.1-031 (Positive)**:
  * *Description:* New owner's unread notification count reflects assignment
  * *Input:* After successful assignment, GET /notifications/count or equivalent endpoint for user EMP-00002.
  * *Expected Output:* HTTP 200 OK. unread_count is incremented by 1 (or equals 1 if no other unread notifications exist).
  * *Traceability:* STORY-2.3.1, C1-52

* **test-ep-2.3.1-032 (Positive)**:
  * *Description:* Notification includes lead details for easy identification
  * *Input:* Inspect the notification payload for a successful assignment of lead with company_name = "Acme Corp" and lead_id = "LD-2026-00042".
  * *Expected Output:* Notification content includes lead ID LD-2026-00042 and company name Acme Corp in the message body or as structured metadata.
  * *Traceability:* STORY-2.3.1, C1-52

* **test-ep-2.3.1-033 (Negative)**:
  * *Description:* Notification failure does not block the assignment operation
  * *Input:* Mock notification service to throw an error. PATCH /leads/{id}/assign with valid request body.
  * *Expected Output:* HTTP 200 OK. Assignment succeeds. Lead ownership updated. Lead history recorded. A notification may be logged as "failed to send" but does not cause a rollback.
  * *Traceability:* STORY-2.3.1, C1-48, C1-52

* **test-ep-2.3.1-034 (Negative)**:
  * *Description:* Previous owner does not receive a notification on reassignment
  * *Input:* Reassign lead from EMP-00002 to EMP-00003. Check notifications for EMP-00002.
  * *Expected Output:* No new notification is created for the previous owner EMP-00002 regarding the reassignment.
  * *Traceability:* STORY-2.3.1, C1-52

* **test-ep-2.3.1-035 (Positive)**:
  * *Description:* Bulk assign triggers notifications for each new owner
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00002"}.
  * *Expected Output:* HTTP 200 OK. Two notifications created for EMP-00002 — one per assigned lead.
  * *Traceability:* STORY-2.3.1, C1-52

---

## 4. API-4: POST /admin/leads/bulk-assign — Bulk Assign (Story 2.3.1 Specific)
*Purpose: Additional test cases specific to story 2.3.1 for the bulk-assign endpoint. Complements base test cases from story 2.2.1 (test-ep-2.2.1-040 through test-ep-2.2.1-051).*

* **test-ep-2.3.1-036 (Positive)**:
  * *Description:* Bulk reassign with reason for leads that have mixed ownership
  * *Input:* POST /admin/leads/bulk-assign with JSON body:
    {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00003","reason":"Team restructure"}. lead-001 has owner EMP-00002, lead-002 has owner EMP-00002.
  * *Expected Output:* HTTP 200 OK. Both leads reassigned to EMP-00003. Lead history entries created for both with previous_owner = "EMP-00002", 
ew_owner = "EMP-00003", eason = "Team restructure", ctor = Admin.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49, C1-50, C1-51

* **test-ep-2.3.1-037 (Positive)**:
  * *Description:* Bulk assign with mix of owned and unowned leads — reason applies to owned leads
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00003","reason":"Reallocation"}. lead-001 has owner, lead-002 has no owner.
  * *Expected Output:* HTTP 200 OK. Both leads assigned. History for lead-001 records reason. History for lead-002 has no reason (initial assignment). Notifications sent for both.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49

* **test-ep-2.3.1-038 (Negative)**:
  * *Description:* Bulk reassign without reason when all selected leads have owners
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00003"}. Both leads have existing owners. No reason field.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"reason": "Reassignment reason is required when one or more leads already have an owner"}. No leads updated. Transaction rolled back.
  * *Traceability:* STORY-2.3.1, C1-49

* **test-ep-2.3.1-039 (Negative)**:
  * *Description:* Bulk reassign without reason when some leads have owners (partial)
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00003"}. lead-001 has owner, lead-002 has no owner. No reason field.
  * *Expected Output:* HTTP 400 Bad Request. JSON error: {"reason": "Reassignment reason is required when one or more leads already have an owner"}. Transaction rolled back. No leads updated.
  * *Traceability:* STORY-2.3.1, C1-49

* **test-ep-2.3.1-040 (Edge)**:
  * *Description:* Bulk assign with lead IDs that include the same lead being assigned to its current owner
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00002"}. lead-001 already assigned to EMP-00002.
  * *Expected Output:* HTTP 200 OK. lead-001 is a no-op (no history entry created). lead-002 is assigned. Count reflects only actually changed leads. Notifications only sent for changed leads.
  * *Traceability:* STORY-2.3.1, C1-48, C1-51

* **test-ep-2.3.1-041 (Edge)**:
  * *Description:* Bulk assign to Admin user (self-assign)
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-002"],"assigned_to":"EMP-00001"}. Authenticated as Admin EMP-00001.
  * *Expected Output:* HTTP 200 OK. Both leads assigned to the Admin user. History records assignment.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-042 (Edge)**:
  * *Description:* Bulk reassign large batch with reason (performance)
  * *Input:* POST /admin/leads/bulk-assign with 500 valid lead IDs all having owners, ssigned_to = "EMP-00003", eason = "Bulk reallocation". Authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. All 500 leads reassigned. 500 history entries created. 500 notifications queued. Response time under acceptable threshold.
  * *Traceability:* STORY-2.3.1, C1-48, C1-49, C1-51, C1-52

* **test-ep-2.3.1-043 (Edge)**:
  * *Description:* Bulk assign with duplicate lead IDs in array
  * *Input:* POST /admin/leads/bulk-assign with {"lead_ids":["lead-001","lead-001","lead-002"],"assigned_to":"EMP-00003","reason":"Dedup test"}.
  * *Expected Output:* HTTP 200 OK. Duplicates deduplicated. Count reflects unique leads only. Only two leads updated.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-044 (Security)**:
  * *Description:* Marketing Executive cannot use bulk-assign endpoint
  * *Input:* POST /admin/leads/bulk-assign with valid body. Authenticated as ME.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: {"error": "Forbidden. Admin access required."}.
  * *Traceability:* STORY-2.3.1, C1-48

* **test-ep-2.3.1-045 (Positive)**:
  * *Description:* Lead immediately disappears from previous owner's list and appears in new owner's list after reassignment
  * *Input:* Reassign lead lead-001 from EMP-00002 to EMP-00003 via PATCH /leads/{id}/assign. Then GET /marketing/leads for EMP-00002 and EMP-00003.
  * *Expected Output:* EMP-00002's lead list no longer contains lead-001. EMP-00003's lead list contains lead-001. This behavior is driven by the ssigned_to field update in the database.
  * *Traceability:* STORY-2.3.1, C1-48, C1-50

---

## 5. API-5: GET /admin/users?role=Marketing Executive — User List for Assignee Dropdown
*Purpose: Admin retrieves active Marketing Executives to populate the assignee selection dropdown in the assign/reassign UI. Only active MEs are returned; inactive users, Admins, and other roles are excluded.*

* **test-ep-2.3.1-046 (Positive)**:
  * *Description:* Admin retrieves active Marketing Executives for assignee dropdown
  * *Input:* `GET /admin/users?role=Marketing%20Executive` authenticated as Admin. Database has 3 active MEs (`EMP-00002`, `EMP-00003`, `EMP-00004`) and 1 inactive ME (`EMP-00005`), and 1 Admin user (`EMP-00001`).
  * *Expected Output:* HTTP 200 OK. Response returns JSON array of only active Marketing Executives. Each user object contains: `employee_id`, `employee_name`, `email`, `role = "Marketing Executive"`, `status = "Active"`. Inactive user `EMP-00005` is excluded. Admin user `EMP-00001` is excluded. Results sorted alphabetically by `employee_name`.
  * *Traceability:* STORY-2.3.1, C1-47, C1-48

* **test-ep-2.3.1-047 (Negative)**:
  * *Description:* Marketing Executive attempting to access admin users endpoint
  * *Input:* `GET /admin/users?role=Marketing%20Executive` authenticated as Marketing Executive `employee_id = "EMP-00004"`.
  * *Expected Output:* HTTP 403 Forbidden. JSON error: `{"error": "Forbidden. Admin access required."}`. No user data returned.
  * *Traceability:* STORY-2.3.1, C1-47, C1-48

* **test-ep-2.3.1-048 (Edge)**:
  * *Description:* Empty response when no active Marketing Executives exist
  * *Input:* `GET /admin/users?role=Marketing%20Executive` authenticated as Admin. Database has 0 active MEs (all MEs deactivated or none exist).
  * *Expected Output:* HTTP 200 OK. Response returns empty JSON array `[]`. No error. Frontend should handle empty state gracefully.
  * *Traceability:* STORY-2.3.1, C1-47, C1-48

---

> **End of Backend API Test Cases for STORY-2.3.1** — Total: 51 test cases (API endpoints 1–5)
