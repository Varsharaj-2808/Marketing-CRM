EPIC-5: Lead Audit & Change Tracking — Backend API Test Cases (STORY-5.1.1: Lead Field Change History)
Epic Goal: Provide full traceability of lead data changes for compliance and audit purposes. Story Goal: As an Admin, I want every change to a lead’s key fields tracked so that I have full traceability of who changed what and when. Tech Stack: Node.js / Express.js / PostgreSQL (Supabase) / JWT Authentication / RBAC / Vitest Total Test Cases: 77

Acceptance Criteria
Schema Update:

The schema must be updated with is_system_generated BOOLEAN DEFAULT FALSE (OR source ENUM('USER','SYSTEM')).
Transaction Requirement:

Every tracked Lead field change must create a History row containing: field name, old value, new value, actor, and timestamp.
Lead update and History insert must occur in the SAME DATABASE TRANSACTION.
If either operation fails, the entire transaction must be rolled back.
History Tab Requirement:

History entries must be returned/displayed ordered by changed_at DESC (newest first).
History entries must clearly indicate USER vs SYSTEM generated changes.
System-generated entries must be clearly distinguished from user-initiated entries.
History is INSERT-ONLY. Any UPDATE, PATCH, or DELETE request against History must be rejected.
CSV Export:

CSV export must exactly match the data shown on screen.
Table of Contents
GET /marketing/leads/:id/field-history
GET /admin/leads/:id/field-history
PUT /marketing/leads/:id/status
PATCH /admin/leads/:id/assign
PUT /marketing/leads/:id/close
PUT /admin/leads/:id/reopen
GET /admin/leads/:id/field-history/export
GET /admin/audit-log
GET /admin/audit-log/:id
GET /admin/audit-log/export
History Immutability & Cross-Cutting
1. GET /marketing/leads/:id/field-history
test-ep-5.1.1-b-001
Category: GET /marketing/leads/:id/field-history

Description: Verify that a Marketing Executive can fetch the field-level change log for a lead assigned to them. Response returns lead_history rows with DB columns: field_name, old_value, new_value, change_summary, changed_by, changed_at, reason. Default limit is 20, sorted newest-first by changed_at.

Preconditions:

User logged in as Marketing Executive me-001.
Lead A is assigned to me-001 and has exactly 15 rows in lead_history table for fields: stage, priority, assigned_to, estimated_value.
Rows span different changed_at timestamps.
Input / Steps:

Send GET /marketing/leads/{leadA-id}/field-history?page=1&limit=20 with Bearer token for me-001.
Expected Result:

HTTP 200 OK.
Response body:
{
  "success": true,
  "data": {
    "lead_id": "<uuid>",
    "total_changes": 15,
    "history": [
      {
        "id": "<uuid>",
        "field_name": "stage",
        "old_value": "New",
        "new_value": "Contacted",
        "change_summary": "Stage changed from New to Contacted",
        "changed_by": { "id": "<user-uuid>", "name": "John Doe" },
        "changed_at": "2026-07-03T14:00:00Z",
        "reason": null
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total_pages": 1 }
}
The history array contains exactly 15 entries.
Each entry contains: id, field_name, old_value, new_value, change_summary, changed_by (object with id and name), changed_at (ISO 8601), reason.
Entries sorted descending by changed_at (newest first).
lead_id in response matches the requested lead’s UUID.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97, C1-99

test-ep-5.1.1-b-002
Category: GET /marketing/leads/:id/field-history

Description: Verify that the field_name query parameter filters results to only changes for the specified field.

Preconditions:

ME me-001 logged in.
Lead A has 5 history rows: 2 for stage, 2 for priority, 1 for assigned_to.
Input / Steps:

Send GET /marketing/leads/{leadA-id}/field-history?field_name=stage with Bearer token for me-001.
Expected Result:

HTTP 200 OK.
The history array contains exactly 2 entries, both with field_name: "stage".
Entries for priority and assigned_to are excluded.
Pagination metadata reflects the filtered count.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-003
Category: GET /marketing/leads/:id/field-history

Description: Verify pagination boundary — initial load returns at most 20 entries per page, with accurate pagination metadata.

Preconditions:

ME me-001 logged in.
Lead A has exactly 25 lead_history rows.
Input / Steps:

Send GET /marketing/leads/{leadA-id}/field-history?page=1&limit=20 with Bearer token for me-001.
Expected Result:

HTTP 200 OK.
The history array contains exactly 20 entries.
Pagination metadata: { "page": 1, "limit": 20, "total_pages": 2 }.
Priority: High | Type: Edge | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-004
Category: GET /marketing/leads/:id/field-history

Description: Verify second page retrieval returns remaining entries beyond the initial 20.

Preconditions:

ME me-001 logged in.
Lead A has exactly 25 lead_history rows.
Input / Steps:

Send GET /marketing/leads/{leadA-id}/field-history?page=2&limit=20 with Bearer token for me-001.
Expected Result:

HTTP 200 OK.
The history array contains exactly 5 entries.
Pagination metadata: { "page": 2, "limit": 20, "total_pages": 2 }.
Priority: Medium | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-005
Category: GET /marketing/leads/:id/field-history

Description: Verify 403 Forbidden when a Marketing Executive queries field history for a lead assigned to a different user.

Preconditions:

ME me-001 logged in.
Lead B is assigned exclusively to me-002.
Input / Steps:

Send GET /marketing/leads/{leadB-id}/field-history with Bearer token for me-001.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Not authorized to view this lead's history" }.
No lead_history data is leaked in the response.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-006
Category: GET /marketing/leads/:id/field-history

Description: Verify 404 when requesting field history for a non-existent lead UUID.

Preconditions:

ME me-001 logged in.
Lead UUID is valid format but does not exist in leads table.
Input / Steps:

Send GET /marketing/leads/00000000-0000-0000-0000-000000000000/field-history with Bearer token for me-001.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-007
Category: GET /marketing/leads/:id/field-history

Description: Verify 400 when lead ID parameter is not a valid UUID format.

Preconditions:

ME me-001 logged in.
Input / Steps:

Send GET /marketing/leads/invalid-uuid-format/field-history with Bearer token for me-001.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid lead ID" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-008
Category: GET /marketing/leads/:id/field-history

Description: Verify empty history response (lead with no lead_history rows) returns an empty array.

Preconditions:

ME me-001 logged in.
Lead C has zero rows in lead_history table.
Input / Steps:

Send GET /marketing/leads/{leadC-id}/field-history with Bearer token for me-001.
Expected Result:

HTTP 200 OK.
Response: { "success": true, "data": { "lead_id": "<uuid>", "total_changes": 0, "history": [] }, "pagination": { "page": 1, "limit": 20, "total_pages": 0 } }.
Priority: Low | Type: Edge | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-009
Category: GET /marketing/leads/:id/field-history

Description: Verify 401 when no authentication token is provided.

Preconditions:

No Bearer token in request header.
Input / Steps:

Send GET /marketing/leads/{any-lead-id}/field-history without Authorization header.
Expected Result:

HTTP 401 Unauthorized.
Response: { "success": false, "message": "No token provided" }.
Priority: High | Type: Authentication | Traceability: STORY-5.1.1

2. GET /admin/leads/:id/field-history
test-ep-5.1.1-b-010
Category: GET /admin/leads/:id/field-history

Description: Verify that Admin can view the full field-level change history for any lead in the system, bypassing ownership restrictions. Default limit is 50.

Preconditions:

User logged in as Admin admin-001.
Lead A is assigned to me-001 (different user).
lead_history table has 30 rows for Lead A.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history?page=1&limit=50 with Admin bearer token.
Expected Result:

HTTP 200 OK.
Response body uses DB columns: field_name, old_value, new_value, change_summary, changed_by (id+name), changed_at, reason.
All 30 entries returned (within a single page).
Entries sorted descending by changed_at.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97, C1-99

test-ep-5.1.1-b-011
Category: GET /admin/leads/:id/field-history

Description: Verify admin field history supports pagination with custom limit.

Preconditions:

Admin admin-001 logged in.
Lead A has 30 total lead_history rows.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history?page=1&limit=20 with Admin token.
Expected Result:

HTTP 200 OK.
Returns exactly 20 entries.
Pagination: { "page": 1, "limit": 20, "total_pages": 2 }.
Priority: Medium | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-012
Category: GET /admin/leads/:id/field-history

Description: Verify admin field history supports filtering by field_name.

Preconditions:

Admin admin-001 logged in.
Lead A has changes to stage, priority, and assigned_to.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history?field_name=assigned_to with Admin token.
Expected Result:

HTTP 200 OK.
Only entries where field_name = 'assigned_to' are returned.
Pagination metadata reflects filtered count.
Priority: Medium | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-013
Category: GET /admin/leads/:id/field-history

Description: Verify 404 when admin requests field history for a non-existent lead.

Preconditions:

Admin admin-001 logged in.
Lead UUID does not exist in leads table.
Input / Steps:

Send GET /admin/leads/00000000-0000-0000-0000-000000000000/field-history with Admin token.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-014
Category: GET /admin/leads/:id/field-history

Description: Verify 400 when admin uses an invalid lead ID format.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/leads/invalid-format/field-history with Admin token.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid lead ID" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-015
Category: GET /admin/leads/:id/field-history

Description: Verify that a Marketing Executive cannot access the admin field-history endpoint (RBAC enforcement).

Preconditions:

User logged in as ME me-001.
Lead A exists.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history with ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-99

test-ep-5.1.1-b-016
Category: GET /admin/leads/:id/field-history

Description: Verify system-generated changes (auto stage validation, system rules) are returned with changed_by indicating system actor.

Preconditions:

Admin admin-001 logged in.
Lead A has both user-initiated and system-generated lead_history rows.
System-generated row: field_name = 'stage', changed_by references a special system user with name “System”.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history with Admin token.
Expected Result:

HTTP 200 OK.
System entries contain changed_by.name = "System".
User entries contain changed_by.name as the actual user’s name.
Both entry types share the same response structure.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-99

3. PUT /marketing/leads/:id/status
test-ep-5.1.1-b-017
Category: PUT /marketing/leads/:id/status

Description: Verify updating a lead’s stage creates a lead_history row capturing field_name, old_value, new_value, changed_by, changed_at — written in the same database transaction. The response includes a history_logged object confirming the entry.

Preconditions:

ME me-001 logged in with valid JWT.
Lead A assigned to me-001 with stage = 'New'.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/status with body { "stage": "Contacted" }.
Expected Result:

HTTP 200 OK.
Response body:
{
  "success": true,
  "message": "Status updated",
  "data": {
    "id": "<lead-uuid>",
    "company_name": "Acme Corp",
    "stage": "Contacted"
  },
  "history_logged": {
    "field_name": "stage",
    "old_value": "New",
    "new_value": "Contacted",
    "change_summary": "Stage changed from New to Contacted",
    "changed_by": { "id": "<me-001-uuid>", "name": "John Doe" },
    "changed_at": "2026-07-04T10:00:00Z"
  }
}
leads table: stage updated to 'Contacted', updated_at refreshed.
lead_history table: new row inserted with field_name = 'stage', old_value = 'New', new_value = 'Contacted', changed_by referencing me-001, changed_at as ISO 8601.
audit_logs table: new row inserted with action_type = 'lead.status_changed', actor = <me-001-uuid>, entity_affected = 'lead', entity_id = <lead-uuid>, result = 'Success', details containing the change.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97, C1-98

test-ep-5.1.1-b-018
Category: PUT /marketing/leads/:id/status

Description: Verify that the history_logged object in the response exactly matches the corresponding lead_history row committed to the database.

Preconditions:

ME me-001 logged in.
Lead A with stage = 'New'.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/status with { "stage": "Contacted" }.
Query the lead_history table directly for the most recent row for Lead A.
Expected Result:

The history_logged.field_name in the response matches lead_history.field_name in DB.
The history_logged.old_value matches lead_history.old_value.
The history_logged.new_value matches lead_history.new_value.
The history_logged.changed_by.id matches lead_history.changed_by FK value.
The history_logged.changed_at matches lead_history.changed_at.
No discrepancy exists between the response and the persisted record.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-98

test-ep-5.1.1-b-019
Category: PUT /marketing/leads/:id/status

Description: Verify 403 when a Marketing Executive attempts to update status on a lead not assigned to them.

Preconditions:

ME me-001 logged in.
Lead B is assigned to me-002.
Input / Steps:

Send PUT /marketing/leads/{leadB-id}/status with { "stage": "Contacted" }.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Not authorized to update this lead" }.
No changes to leads table for Lead B.
No new row in lead_history table.
No new row in audit_logs table.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-020
Category: PUT /marketing/leads/:id/status

Description: Verify 400 when status value is not in the allowed enum of valid stages.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/status with { "stage": "InvalidStage" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Stage must be one of: New, Contacted, Qualified, Meeting, Proposal, Negotiation, Won, Lost, Hold" }.
No changes to leads or lead_history tables.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-021
Category: PUT /marketing/leads/:id/status

Description: Verify 404 when updating status on a lead that does not exist.

Preconditions:

ME me-001 logged in.
Lead UUID is valid format but does not exist.
Input / Steps:

Send PUT /marketing/leads/00000000-0000-0000-0000-000000000000/status with { "stage": "Contacted" }.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1

test-ep-5.1.1-b-022
Category: PUT /marketing/leads/:id/status

Description: Verify 422 when an invalid stage transition is attempted (e.g., New -> Qualified directly, skipping Contacted). Response includes allowed_next array.

Preconditions:

ME me-001 logged in.
Lead A has stage = 'New'.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/status with { "stage": "Qualified" }.
Expected Result:

HTTP 422 Unprocessable Entity.
Response: { "success": false, "message": "Invalid stage transition. New can only move to Contacted.", "allowed_next": ["Contacted"] }.
leads.stage for Lead A remains 'New'.
No lead_history row is created.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-98

test-ep-5.1.1-b-023
Category: PUT /marketing/leads/:id/status

Description: Verify 401 when no authentication token is provided.

Preconditions:

No Bearer token.
Input / Steps:

Send PUT /marketing/leads/{any-lead-id}/status with { "stage": "Contacted" } without Authorization header.
Expected Result:

HTTP 401 Unauthorized.
Response: { "success": false, "message": "No token provided" }.
Priority: High | Type: Authentication | Traceability: STORY-5.1.1

test-ep-5.1.1-b-024
Category: PUT /marketing/leads/:id/status

Description: Verify transaction atomicity — if the lead update fails after history row is inserted, both operations are rolled back. No orphan lead_history row exists.

Preconditions:

ME me-001 logged in.
Lead A exists.
Simulate a database constraint violation on the leads update (e.g., invalid foreign key value).
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/status with a payload that passes validation but triggers a DB constraint failure on update.
Expected Result:

HTTP 500 Internal Server Error.
The lead_history table has no new row for this failed attempt.
The leads.stage value is unchanged.
The audit_logs table has no entry for this failed attempt.
Database integrity is maintained.
Priority: High | Type: Transaction | Traceability: STORY-5.1.1, C1-98

test-ep-5.1.1-b-025
Category: PUT /marketing/leads/:id/status

Description: Verify that updating a tracked field with the same value does NOT create a duplicate lead_history entry.

Preconditions:

ME me-001 logged in.
Lead A has stage = 'Contacted'.
Input / Steps:

Record the current count of lead_history rows for Lead A.
Send PUT /marketing/leads/{leadA-id}/status with { "stage": "Contacted" } (same value).
Expected Result:

HTTP 200 OK.
Response indicates no change was necessary.
The count of lead_history rows for Lead A remains unchanged.
No duplicate entry is created.
Priority: Medium | Type: Edge | Traceability: STORY-5.1.1, C1-98

4. PATCH /admin/leads/:id/assign
test-ep-5.1.1-b-026
Category: PATCH /admin/leads/:id/assign

Description: Verify Admin can assign an unassigned lead to a user. Creates a lead_history row with field_name = 'assigned_to' and an audit_logs entry.

Preconditions:

Admin admin-001 logged in with valid JWT.
Lead A exists with assigned_to = NULL.
Target user me-002 exists in users table.
Input / Steps:

Send PATCH /admin/leads/{leadA-id}/assign with body { "assigned_to": "<me-002-uuid>" }.
Expected Result:

HTTP 200 OK.
Response:
{
  "success": true,
  "message": "Lead assigned",
  "data": {
    "id": "<lead-uuid>",
    "company_name": "Acme Corp",
    "assigned_to": { "id": "<me-002-uuid>", "name": "Jane Smith" }
  },
  "history_logged": {
    "field_name": "assigned_to",
    "old_value": "",
    "new_value": "Jane Smith",
    "change_summary": "Lead assigned to Jane Smith",
    "changed_by": { "id": "<admin-001-uuid>", "name": "Admin User" },
    "changed_at": "2026-07-04T10:00:00Z"
  }
}
leads.assigned_to updated to me-002-uuid.
lead_history table: new row with field_name = 'assigned_to', old_value = '', new_value = 'Jane Smith', changed_by = admin-001.
audit_logs table: new row with action_type = 'lead.assigned', actor = admin-001, entity_affected = 'lead', entity_id = leadA-uuid, result = 'Success', details containing { "from": null, "to": "me-002-uuid" }.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97, C1-98

test-ep-5.1.1-b-027
Category: PATCH /admin/leads/:id/assign

Description: Verify reassigning a lead from one user to another creates a history entry showing both old and new assignee.

Preconditions:

Admin admin-001 logged in.
Lead B has assigned_to = me-001.
Target user me-003 exists.
Input / Steps:

Send PATCH /admin/leads/{leadB-id}/assign with { "assigned_to": "<me-003-uuid>" }.
Expected Result:

HTTP 200 OK.
history_logged.old_value = 'John Doe' (name of me-001).
history_logged.new_value = 'Sarah Connor' (name of me-003).
lead_history row has field_name = 'assigned_to', old_value = 'John Doe', new_value = 'Sarah Connor'.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-98

test-ep-5.1.1-b-028
Category: PATCH /admin/leads/:id/assign

Description: Verify 400 when lead ID is not a valid UUID format.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send PATCH /admin/leads/invalid-format/assign with { "assigned_to": "<valid-uuid>" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid lead ID" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-029
Category: PATCH /admin/leads/:id/assign

Description: Verify 400 when assigned_to user ID is not a valid UUID format.

Preconditions:

Admin admin-001 logged in.
Lead A exists.
Input / Steps:

Send PATCH /admin/leads/{leadA-id}/assign with { "assigned_to": "not-a-uuid" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid user ID" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-030
Category: PATCH /admin/leads/:id/assign

Description: Verify 404 when the lead does not exist.

Preconditions:

Admin admin-001 logged in.
Lead UUID is valid format but does not exist.
Input / Steps:

Send PATCH /admin/leads/00000000-0000-0000-0000-000000000000/assign with { "assigned_to": "<valid-user-uuid>" }.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1

test-ep-5.1.1-b-031
Category: PATCH /admin/leads/:id/assign

Description: Verify 404 when the target user does not exist in the users table.

Preconditions:

Admin admin-001 logged in.
Lead A exists.
Target user UUID is valid format but does not match any user.
Input / Steps:

Send PATCH /admin/leads/{leadA-id}/assign with { "assigned_to": "00000000-0000-0000-0000-000000000000" }.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "User not found" }.
leads.assigned_to for Lead A is unchanged.
Priority: High | Type: Negative | Traceability: STORY-5.1.1

test-ep-5.1.1-b-032
Category: PATCH /admin/leads/:id/assign

Description: Verify 403 when a Marketing Executive attempts to access the admin assign endpoint.

Preconditions:

User logged in as ME me-001.
Input / Steps:

Send PATCH /admin/leads/{any-lead-id}/assign with { "assigned_to": "<valid-uuid>" } using ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-033
Category: PATCH /admin/leads/:id/assign

Description: Verify transaction atomicity — if the lead update succeeds but the lead_history insert fails, the entire operation rolls back and leads.assigned_to remains unchanged.

Preconditions:

Admin admin-001 logged in.
Lead A exists with assigned_to = NULL.
Simulate a lead_history insert failure (e.g., FK constraint violation on changed_by).
Input / Steps:

Attempt PATCH /admin/leads/{leadA-id}/assign with a payload that triggers the failure.
Expected Result:

HTTP 500 Internal Server Error.
leads.assigned_to for Lead A remains NULL.
No audit_logs entry is created.
No partial data is persisted.
Priority: High | Type: Transaction | Traceability: STORY-5.1.1, C1-98

5. PUT /marketing/leads/:id/close
test-ep-5.1.1-b-034
Category: PUT /marketing/leads/:id/close

Description: Close a lead as Won — creates lead_history row for stage field, records final_deal_value and closure_date on the lead.

Preconditions:

ME me-001 logged in with valid JWT.
Lead A assigned to me-001, stage = 'Negotiation'.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/close with body { "stage": "Won", "final_deal_value": 250000, "closure_date": "2026-06-30" }.
Expected Result:

HTTP 200 OK.
Response:
{
  "success": true,
  "message": "Lead closed as Won",
  "data": {
    "id": "<lead-uuid>",
    "company_name": "Acme Corp",
    "stage": "Won",
    "final_deal_value": 250000,
    "closure_date": "2026-06-30",
    "closed_at": "2026-07-04T10:00:00Z"
  },
  "history_logged": {
    "field_name": "stage",
    "old_value": "Negotiation",
    "new_value": "Won",
    "change_summary": "Stage changed from Negotiation to Won",
    "changed_by": { "id": "<me-001-uuid>", "name": "John Doe" },
    "changed_at": "2026-07-04T10:00:00Z"
  }
}
leads table: stage = 'Won', final_deal_value = 250000, closure_date = '2026-06-30', closed_at set.
lead_history table: new row with field_name = 'stage', old_value = 'Negotiation', new_value = 'Won'.
audit_logs table: new row with action_type = 'lead.closed_won', details containing { "final_deal_value": 250000 }.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97, C1-100

test-ep-5.1.1-b-035
Category: PUT /marketing/leads/:id/close

Description: Close a lead as Lost — creates lead_history row and records loss_reason on the lead.

Preconditions:

ME me-001 logged in.
Lead B assigned to me-001, stage = 'Negotiation'.
Input / Steps:

Send PUT /marketing/leads/{leadB-id}/close with body { "stage": "Lost", "loss_reason": "Budget" }.
Expected Result:

HTTP 200 OK.
Response:
{
  "success": true,
  "message": "Lead closed as Lost",
  "data": {
    "id": "<lead-uuid>",
    "company_name": "Beta Inc",
    "stage": "Lost",
    "loss_reason": "Budget",
    "closed_at": "2026-07-04T10:00:00Z"
  },
  "history_logged": {
    "field_name": "stage",
    "old_value": "Negotiation",
    "new_value": "Lost",
    "change_summary": "Stage changed from Negotiation to Lost",
    "changed_by": { "id": "<me-001-uuid>", "name": "John Doe" },
    "changed_at": "2026-07-04T10:00:00Z"
  }
}
leads table: stage = 'Lost', loss_reason = 'Budget', closed_at set.
lead_history row: field_name = 'stage', old_value = 'Negotiation', new_value = 'Lost'.
audit_logs entry: action_type = 'lead.closed_lost', details containing { "loss_reason": "Budget" }.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-036
Category: PUT /marketing/leads/:id/close

Description: Verify 403 when attempting to close a lead not assigned to the user.

Preconditions:

ME me-001 logged in.
Lead C assigned to me-002.
Input / Steps:

Send PUT /marketing/leads/{leadC-id}/close with { "stage": "Lost", "loss_reason": "No Response" }.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Not authorized to close this lead" }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-037
Category: PUT /marketing/leads/:id/close

Description: Verify 404 when closing a non-existent lead.

Preconditions:

ME me-001 logged in.
Lead UUID does not exist.
Input / Steps:

Send PUT /marketing/leads/00000000-0000-0000-0000-000000000000/close with { "stage": "Lost", "loss_reason": "Budget" }.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1

test-ep-5.1.1-b-038
Category: PUT /marketing/leads/:id/close

Description: Verify 400 when close status is not Won or Lost.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/close with { "stage": "New" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Status must be Won or Lost to close" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-039
Category: PUT /marketing/leads/:id/close

Description: Verify 400 when closing as Lost without providing loss_reason.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/close with { "stage": "Lost" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Loss reason is required when closing as Lost" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-040
Category: PUT /marketing/leads/:id/close

Description: Verify 400 when loss_reason is not in the allowed enum values.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/close with { "stage": "Lost", "loss_reason": "InvalidReason" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Loss reason must be: Budget, Competitor, No Response, Cancelled, Other" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-041
Category: PUT /marketing/leads/:id/close

Description: Verify 400 when closing as Won without final_deal_value and closure_date.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/close with { "stage": "Won" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "final_deal_value and closure_date are required when closing as Won" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-042
Category: PUT /marketing/leads/:id/close

Description: Verify 400 when final_deal_value is negative.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001.
Input / Steps:

Send PUT /marketing/leads/{leadA-id}/close with { "stage": "Won", "final_deal_value": -1000, "closure_date": "2026-06-30" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "final_deal_value must be a positive number" }.
Priority: Medium | Type: Validation | Traceability: STORY-5.1.1

test-ep-5.1.1-b-043
Category: PUT /marketing/leads/:id/close

Description: Verify transaction atomicity — if the lead update succeeds but lead_history insert fails, the entire close operation rolls back.

Preconditions:

ME me-001 logged in.
Lead A assigned to me-001, stage = 'Negotiation'.
Simulate a failure in the lead_history insert (e.g., DB constraint).
Input / Steps:

Attempt PUT /marketing/leads/{leadA-id}/close with { "stage": "Won", "final_deal_value": 250000, "closure_date": "2026-06-30" } under simulated failure.
Expected Result:

HTTP 500 Internal Server Error.
leads.stage for Lead A remains 'Negotiation'.
leads.final_deal_value remains NULL.
No lead_history row created.
No audit_logs entry created.
Priority: High | Type: Transaction | Traceability: STORY-5.1.1, C1-98

6. PUT /admin/leads/:id/reopen
test-ep-5.1.1-b-044
Category: PUT /admin/leads/:id/reopen

Description: Admin reopens a Won lead — creates lead_history row recording the transition from Won to Contacted with the reopen reason.

Preconditions:

Admin admin-001 logged in with valid JWT.
Lead A has stage = 'Won'.
Input / Steps:

Send PUT /admin/leads/{leadA-id}/reopen with body { "reopen_reason": "Client expressed renewed interest after 3 months" }.
Expected Result:

HTTP 200 OK.
Response:
{
  "success": true,
  "message": "Lead reopened",
  "data": {
    "id": "<lead-uuid>",
    "company_name": "Acme Corp",
    "stage": "Contacted",
    "reopened_by": { "id": "<admin-001-uuid>", "name": "Admin User" },
    "reopen_reason": "Client expressed renewed interest after 3 months",
    "reopened_at": "2026-07-04T10:00:00Z"
  },
  "history_logged": {
    "field_name": "stage",
    "old_value": "Won",
    "new_value": "Contacted",
    "change_summary": "Lead reopened from Won to Contacted",
    "changed_by": { "id": "<admin-001-uuid>", "name": "Admin User" },
    "changed_at": "2026-07-04T10:00:00Z",
    "reason": "Client expressed renewed interest after 3 months"
  }
}
leads table: stage = 'Contacted', lost_reason cleared, closed_at cleared.
lead_history table: new row with field_name = 'stage', old_value = 'Won', new_value = 'Contacted', reason = 'Client expressed renewed interest after 3 months'.
audit_logs table: new row with action_type = 'lead.reopened', actor = admin-001.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-045
Category: PUT /admin/leads/:id/reopen

Description: Admin reopens a Lost lead — same behavior as reopening a Won lead.

Preconditions:

Admin admin-001 logged in.
Lead B has stage = 'Lost'.
Input / Steps:

Send PUT /admin/leads/{leadB-id}/reopen with { "reopen_reason": "Client returned with new requirements" }.
Expected Result:

HTTP 200 OK.
lead_history entry: field_name = 'stage', old_value = 'Lost', new_value = 'Contacted', reason = 'Client returned with new requirements'.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-046
Category: PUT /admin/leads/:id/reopen

Description: Verify 400 when reopen reason is missing.

Preconditions:

Admin admin-001 logged in.
Lead A has stage = 'Won'.
Input / Steps:

Send PUT /admin/leads/{leadA-id}/reopen with {}.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Reopen reason is required" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-047
Category: PUT /admin/leads/:id/reopen

Description: Verify 400 when reopening a lead that is not in Won or Lost status.

Preconditions:

Admin admin-001 logged in.
Lead C has stage = 'Negotiation'.
Input / Steps:

Send PUT /admin/leads/{leadC-id}/reopen with { "reopen_reason": "Client reconsidered" }.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Only Won or Lost leads can be reopened" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-048
Category: PUT /admin/leads/:id/reopen

Description: Verify 404 when reopening a non-existent lead.

Preconditions:

Admin admin-001 logged in.
Lead UUID does not exist.
Input / Steps:

Send PUT /admin/leads/00000000-0000-0000-0000-000000000000/reopen with { "reopen_reason": "Reason" }.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1

test-ep-5.1.1-b-049
Category: PUT /admin/leads/:id/reopen

Description: Verify 403 when a Marketing Executive attempts to reopen a lead.

Preconditions:

User logged in as ME me-001.
Lead A has stage = 'Won'.
Input / Steps:

Send PUT /admin/leads/{leadA-id}/reopen with { "reopen_reason": "Reason" } using ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1

test-ep-5.1.1-b-050
Category: PUT /admin/leads/:id/reopen

Description: Verify transaction atomicity — both the lead record update and lead_history insertion occur in the same transaction.

Preconditions:

Admin admin-001 logged in.
Lead A has stage = 'Won'.
Simulate a failure mid-operation.
Input / Steps:

Attempt PUT /admin/leads/{leadA-id}/reopen under injected failure condition.
Expected Result:

HTTP 500 Internal Server Error.
leads.stage remains 'Won'.
No lead_history row created.
No audit_logs entry created.
Priority: High | Type: Transaction | Traceability: STORY-5.1.1, C1-98

7. GET /admin/leads/:id/field-history/export
test-ep-5.1.1-b-051
Category: GET /admin/leads/:id/field-history/export

Description: Admin exports a lead’s field history as CSV. The CSV content matches exactly what is shown on screen, with columns: field_name, old_value, new_value, change_summary, changed_by, changed_at, reason.

Preconditions:

Admin admin-001 logged in.
Lead A has 5 lead_history entries visible on the History tab.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history/export?format=csv with Admin token.
Expected Result:

HTTP 200 OK.
Content-Type: text/csv.
Content-Disposition: attachment; filename="lead-history-{leadId}-{date}.csv".
CSV header row: field_name,old_value,new_value,change_summary,changed_by_name,changed_at,reason.
CSV contains exactly 5 data rows.
Each row’s data matches the corresponding table cell value displayed on the History tab at the time of export.
changed_at uses ISO 8601 format.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-052
Category: GET /admin/leads/:id/field-history/export

Description: Verify 400 when the format parameter is not csv.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history/export?format=pdf.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Format must be csv" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-053
Category: GET /admin/leads/:id/field-history/export

Description: Verify 404 when exporting history for a non-existent lead.

Preconditions:

Admin admin-001 logged in.
Lead UUID does not exist.
Input / Steps:

Send GET /admin/leads/00000000-0000-0000-0000-000000000000/field-history/export?format=csv.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Lead not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-054
Category: GET /admin/leads/:id/field-history/export

Description: Verify 404 when the lead has no lead_history rows to export.

Preconditions:

Admin admin-001 logged in.
Lead B exists but has zero lead_history entries.
Input / Steps:

Send GET /admin/leads/{leadB-id}/field-history/export?format=csv.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "No history found for this lead" }.
Priority: Low | Type: Edge | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-055
Category: GET /admin/leads/:id/field-history/export

Description: Verify 403 when a Marketing Executive attempts to export field history.

Preconditions:

User logged in as ME me-001.
Lead A assigned to me-001.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history/export?format=csv with ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-101

8. GET /admin/audit-log
test-ep-5.1.1-b-056
Category: GET /admin/audit-log

Description: Admin fetches the system-wide audit log with filters (actor, action_type, entity_affected, date range). Response uses audit_logs DB columns: action_type, actor, entity_affected, entity_id, result, ip_address, details, created_at.

Preconditions:

Admin admin-001 logged in.
audit_logs table has ~980 entries across various entities and actions.
Input / Steps:

Send GET /admin/audit-log?actor=<user-uuid>&action_type=lead.status_changed&entity_affected=lead&from=2026-06-01&to=2026-06-26&page=1&limit=50.
Expected Result:

HTTP 200 OK.
Response:
{
  "success": true,
  "data": [
    {
      "id": "<uuid>",
      "action_type": "lead.status_changed",
      "actor": { "id": "<user-uuid>", "name": "John Doe", "role": "Marketing" },
      "entity_affected": "lead",
      "entity_id": "<lead-uuid>",
      "result": "Success",
      "ip_address": "203.0.113.45",
      "details": { "field_name": "stage", "from": "New", "to": "Contacted" },
      "created_at": "2026-06-20T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "total_pages": 20, "total_records": 980 }
}
Only entries matching the applied filters are returned.
Results sorted descending by created_at.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97, C1-99

test-ep-5.1.1-b-057
Category: GET /admin/audit-log

Description: Verify audit log pagination with configurable page size.

Preconditions:

Admin admin-001 logged in.
audit_logs has 100 entries for a given filter.
Input / Steps:

Send GET /admin/audit-log?page=1&limit=10.
Expected Result:

HTTP 200 OK.
Returns exactly 10 entries.
Pagination: { "page": 1, "limit": 10, "total_pages": 10, "total_records": 100 }.
Priority: Medium | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-058
Category: GET /admin/audit-log

Description: Verify filtering by entity_affected returns only entries for that entity type.

Preconditions:

Admin admin-001 logged in.
audit_logs has entries for entity_affected = 'lead' and entity_affected = 'user'.
Input / Steps:

Send GET /admin/audit-log?entity_affected=user.
Expected Result:

HTTP 200 OK.
All returned entries have entity_affected = 'user'.
lead entries are excluded.
Priority: Medium | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-059
Category: GET /admin/audit-log

Description: Verify 400 when from or to date parameters are not in valid YYYY-MM-DD format.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/audit-log?from=invalid-date.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid date format. Use YYYY-MM-DD" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-060
Category: GET /admin/audit-log

Description: Verify empty response when no audit log entries match the applied filters.

Preconditions:

Admin admin-001 logged in.
No entries exist for the given date range.
Input / Steps:

Send GET /admin/audit-log?from=2025-01-01&to=2025-01-02.
Expected Result:

HTTP 200 OK.
Response: { "success": true, "data": [], "pagination": { "page": 1, "total_pages": 0, "total_records": 0 } }.
Priority: Medium | Type: Edge | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-061
Category: GET /admin/audit-log

Description: Verify 403 when a Marketing Executive attempts to access the audit log.

Preconditions:

User logged in as ME me-001.
Input / Steps:

Send GET /admin/audit-log?page=1&limit=20 with ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-062
Category: GET /admin/audit-log

Description: Verify SQL injection attempt on filter parameters is properly sanitized.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/audit-log?action_type=lead.status_changed'; DROP TABLE audit_logs; --.
Expected Result:

HTTP 200 OK with zero results, OR HTTP 400 Bad Request.
The audit_logs table is NOT dropped.
Database integrity is maintained.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

9. GET /admin/audit-log/:id
test-ep-5.1.1-b-063
Category: GET /admin/audit-log/:id

Description: Admin fetches a single audit log entry by its UUID with full detail.

Preconditions:

Admin admin-001 logged in.
Audit log entry with known UUID audit-entry-001 exists in audit_logs table.
Input / Steps:

Send GET /admin/audit-log/{audit-entry-001-uuid} with Admin token.
Expected Result:

HTTP 200 OK.
Response:
{
  "success": true,
  "data": {
    "id": "audit-entry-001-uuid",
    "action_type": "lead.status_changed",
    "actor": { "id": "<uuid>", "name": "John Doe", "role": "Marketing" },
    "entity_affected": "lead",
    "entity_id": "<lead-uuid>",
    "result": "Success",
    "ip_address": "203.0.113.45",
    "details": { "field_name": "stage", "from": "New", "to": "Contacted" },
    "created_at": "2026-06-20T10:00:00Z"
  }
}
All fields are populated with the correct stored values.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-064
Category: GET /admin/audit-log/:id

Description: Verify 404 when the audit log entry does not exist.

Preconditions:

Admin admin-001 logged in.
UUID is valid format but does not match any audit_logs row.
Input / Steps:

Send GET /admin/audit-log/00000000-0000-0000-0000-000000000000 with Admin token.
Expected Result:

HTTP 404 Not Found.
Response: { "success": false, "message": "Audit log entry not found" }.
Priority: High | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-065
Category: GET /admin/audit-log/:id

Description: Verify 400 when the audit log ID is not a valid UUID format.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/audit-log/not-a-valid-uuid with Admin token.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid audit log ID" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-066
Category: GET /admin/audit-log/:id

Description: Verify 403 when a Marketing Executive attempts to view a single audit log entry.

Preconditions:

User logged in as ME me-001.
Audit log entry with valid UUID exists.
Input / Steps:

Send GET /admin/audit-log/{existing-uuid} with ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

10. GET /admin/audit-log/export
test-ep-5.1.1-b-067
Category: GET /admin/audit-log/export

Description: Admin exports the audit log as CSV within a specified date range.

Preconditions:

Admin admin-001 logged in.
audit_logs table has entries between 2026-06-01 and 2026-06-26.
Input / Steps:

Send GET /admin/audit-log/export?from=2026-06-01&to=2026-06-26&format=csv with Admin token.
Expected Result:

HTTP 200 OK.
Content-Type: text/csv.
Content-Disposition: attachment; filename="audit-log-{date}.csv".
CSV header row: id,action_type,actor_name,actor_role,entity_affected,entity_id,result,ip_address,details,created_at.
CSV body contains entries only within the specified date range.
Each row matches the corresponding audit log entry data.
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-068
Category: GET /admin/audit-log/export

Description: Verify 400 when export format is not csv.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/audit-log/export?from=2026-06-01&to=2026-06-26&format=pdf.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Format must be csv" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-069
Category: GET /admin/audit-log/export

Description: Verify 400 when date format in from or to is invalid.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send GET /admin/audit-log/export?from=invalid-date&format=csv.
Expected Result:

HTTP 400 Bad Request.
Response: { "success": false, "message": "Invalid date format. Use YYYY-MM-DD" }.
Priority: Medium | Type: Negative | Traceability: STORY-5.1.1, C1-101

test-ep-5.1.1-b-070
Category: GET /admin/audit-log/export

Description: Verify 403 when a Marketing Executive attempts to export the audit log.

Preconditions:

User logged in as ME me-001.
Input / Steps:

Send GET /admin/audit-log/export?from=2026-06-01&to=2026-06-26&format=csv with ME token.
Expected Result:

HTTP 403 Forbidden.
Response: { "success": false, "message": "Access denied. Admin role required." }.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-101

11. History Immutability & Cross-Cutting
test-ep-5.1.1-b-071
Category: History Immutability

Description: Verify that PUT requests against the lead_history resource are rejected (HTTP 405), ensuring the history table is insert-only.

Preconditions:

Admin admin-001 logged in.
Lead A exists with lead_history rows.
Input / Steps:

Send PUT /admin/leads/{leadA-id}/field-history with body { "field_name": "stage", "old_value": "New", "new_value": "Contacted" }.
Expected Result:

HTTP 405 Method Not Allowed.
Response: { "success": false, "message": "Method not allowed" }.
The lead_history table remains unchanged.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-072
Category: History Immutability

Description: Verify that PATCH requests against the lead_history resource are rejected (HTTP 405).

Preconditions:

Admin admin-001 logged in.
Lead A exists with lead_history rows.
Input / Steps:

Send PATCH /admin/leads/{leadA-id}/field-history with body { "old_value": "Updated" }.
Expected Result:

HTTP 405 Method Not Allowed.
No lead_history rows are modified.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-073
Category: History Immutability

Description: Verify that DELETE requests against the lead_history resource are rejected (HTTP 405).

Preconditions:

Admin admin-001 logged in.
Lead A exists with lead_history rows.
Input / Steps:

Send DELETE /admin/leads/{leadA-id}/field-history.
Expected Result:

HTTP 405 Method Not Allowed.
No lead_history rows are deleted.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-074
Category: History Immutability

Description: Verify that no POST route exists to manually insert lead_history rows — history is only created internally by tracking middleware.

Preconditions:

Admin admin-001 logged in.
Input / Steps:

Send POST /admin/leads/{leadA-id}/field-history with a fabricated history body.
Expected Result:

HTTP 405 Method Not Allowed (or 404 if no route registered).
No new lead_history row is created.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-100

test-ep-5.1.1-b-075
Category: Cross-Cutting

Description: Verify XSS prevention — script tags stored in old_value or new_value are returned safely in JSON without server-side processing or execution.

Preconditions:

Admin admin-001 logged in.
Lead A has a lead_history row where old_value contains <script>alert('XSS')</script>.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history.
Expected Result:

HTTP 200 OK.
The old_value field in the response contains the exact literal string <script>alert('XSS')</script>.
The backend returns the string safely encoded in JSON without executing or stripping it.
Response is valid JSON with no HTML injection.
Priority: High | Type: Security | Traceability: STORY-5.1.1, C1-97

test-ep-5.1.1-b-076
Category: Cross-Cutting

Description: Verify query performance on lead_history with large datasets (10,000+ entries for a single lead).

Preconditions:

Admin admin-001 logged in.
Lead A has 10,000 lead_history rows with proper indexes on lead and changed_at.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history?page=1&limit=20.
Expected Result:

HTTP 200 OK.
The query completes within acceptable time limits.
Pagination metadata is accurate: total_pages = 500, total_records = 10000.
Priority: Low | Type: Performance | Traceability: STORY-5.1.1, C1-98

test-ep-5.1.1-b-077
Category: History Immutability & Cross-Cutting

Description: Verify USER-generated vs SYSTEM-generated history entries are correctly identified.

Preconditions:

Admin admin-001 logged in.
Lead A has both a user-initiated change and a system-generated change.
Input / Steps:

Send GET /admin/leads/{leadA-id}/field-history.
Expected Result:

HTTP 200 OK.
The user-initiated history entry contains is_system_generated: false (or source: "USER").
The system-generated history entry contains is_system_generated: true (or source: "SYSTEM").
Priority: High | Type: Positive | Traceability: STORY-5.1.1, C1-97

End of Backend API Test Cases for STORY-5.1.1 — Total: 77 test cases

