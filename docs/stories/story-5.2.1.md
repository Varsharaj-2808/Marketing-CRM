# EPIC-5: Lead Audit & Change Tracking — Backend API Test Cases (STORY-5.2.1: System-wide Audit Log)

> **Epic Goal:** Provide full traceability of lead data changes and administrative actions for compliance and audit purposes.
> **Story Goal:** As an Admin, I want a system-wide audit log of user actions (logins, user management, assignment, category management) so that I can investigate issues and ensure accountability.
> **Tech Stack:** Node.js / Express.js / PostgreSQL / JWT Authentication / RBAC / Vitest / Supertest
> **Total Test Cases:** 42

---

## Acceptance Criteria

1. **Transaction Requirement**:
   - Given any instrumented action occurs anywhere in the system, then a corresponding Audit Log entry is created within the same request/transaction, never as a best-effort async afterthought that could silently fail.
   - If the audit log insertion fails, the entire transaction (e.g. user creation, category update, assignment, login) must roll back.

2. **Access Control**:
   - Only the Admin role can view the Audit Log screen, trigger archives, or modify retention policies.
   - Direct URL access / API endpoints must be blocked (HTTP 403) for Marketing Executives.

3. **Filters & Sorting**:
   - Admin can filter the Audit Log by Actor, Action Type, Date Range (`from` and `to`), and Entity affected.
   - Results must be sorted newest-first by default (`created_at` DESC) and support pagination.

4. **CSV Export**:
   - Results can be exported as a CSV file stream. The content must reflect the applied filters.
   - Requesting formats other than `csv` (e.g. `format=pdf`) must be rejected with HTTP 400.
   - If no records match the applied filters, return HTTP 404.

5. **Retention Policy & Archival**:
   - Retention policy field must be configurable (default 12 months) and saved in system settings.
   - An archival job (system/cron triggered) moves audit logs older than the configured months to the archive storage (`audit_logs_archive`), leaving active records untouched.

---

## Table of Contents

1. [GET /admin/audit-log](#1-get-adminaudit-log)
2. [GET /admin/audit-log/:id](#2-get-adminaudit-logid)
3. [GET /admin/audit-log/export](#3-get-adminaudit-logexport)
4. [GET /admin/system-settings/audit-retention](#4-get-adminsystem-settingsaudit-retention)
5. [PUT /admin/system-settings/audit-retention](#5-put-adminsystem-settingsaudit-retention)
6. [POST /admin/audit-log/archive](#6-post-adminaudit-logarchive)
7. [Action Instrumentation & Transaction Validation](#7-action-instrumentation--transaction-validation)

---

## 1. GET /admin/audit-log

### test-ep-5.2.1-b-001
**Category:** GET /admin/audit-log

**Description:** Verify that an Admin can fetch the system-wide audit logs with default sorting (newest-first) and pagination.

**Preconditions:**
1. User logged in as Admin with valid JWT.
2. System has exactly 15 audit logs stored in the `audit_logs` table across different dates.

**Input / Steps:**
1. Send `GET /admin/audit-log?actor=&action_type=&entity=lead&from=2026-01-01&to=2026-07-07&sort_order=desc&page=1&limit=50` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": [
    {
      "id": "e0b0e513-ef9f-4318-8097-f0bb26922f30",
      "seq": 1,
      "actor": {
        "id": "actor-uuid-1",
        "name": "Admin User",
        "role": "Admin"
      },
      "action_type": "lead.assigned",
      "entity_affected": "lead",
      "entity_id": "lead-uuid-1",
      "result": "success",
      "ip_address": "203.0.113.45",
      "details": {},
      "created_at": "2026-07-07T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total_pages": 20,
    "total_records": 980
  }
}
```
3. Returned logs are sorted by `created_at` DESC (newest first).

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-002
**Category:** GET /admin/audit-log

**Description:** Verify filtering audit logs by a specific `actor` UUID.

**Preconditions:**
1. Admin logged in.
2. `audit_logs` has 5 entries by `actor-uuid-1` and 3 entries by `actor-uuid-2`.

**Input / Steps:**
1. Send `GET /admin/audit-log?actor=actor-uuid-1` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Every item in the `data` array contains `"actor": { "id": "actor-uuid-1", ... }`.
3. Items for other actors are excluded.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-003
**Category:** GET /admin/audit-log

**Description:** Verify filtering audit logs by `action_type`.

**Preconditions:**
1. Admin logged in.
2. `audit_logs` has entries with `action_type` = `'user.login'`, `'lead.assigned'`, and `'category.created'`.

**Input / Steps:**
1. Send `GET /admin/audit-log?action_type=user.login` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Every item in the `data` array contains `action_type: "user.login"`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-004
**Category:** GET /admin/audit-log

**Description:** Verify filtering audit logs by `entity_affected`.

**Preconditions:**
1. Admin logged in.
2. `audit_logs` contains records affecting `'user'`, `'lead'`, and `'category'`.

**Input / Steps:**
1. Send `GET /admin/audit-log?entity=user` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Every item in the `data` array has `entity_affected: "user"`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-005
**Category:** GET /admin/audit-log

**Description:** Verify filtering audit logs by date range (`from` and `to`).

**Preconditions:**
1. Admin logged in.
2. `audit_logs` contains logs with `created_at` timestamps spanning January 2026 to July 2026.

**Input / Steps:**
1. Send `GET /admin/audit-log?from=2026-01-01&to=2026-07-07` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. All returned items have `created_at` values strictly between `2026-01-01T00:00:00.000Z` and `2026-07-07T23:59:59.999Z`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-006
**Category:** GET /admin/audit-log

**Description:** Verify date filter boundary condition — returning entries exactly matching the boundary date.

**Preconditions:**
1. Admin logged in.
2. One audit log exists with `created_at` = `'2026-07-07T00:00:00Z'`.
3. Another exists with `created_at` = `'2026-07-08T00:00:00Z'`.

**Input / Steps:**
1. Send `GET /admin/audit-log?from=2026-07-07&to=2026-07-07` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Only the entry on `2026-07-07` is returned. The entry on `2026-07-08` is excluded.

**Priority:** Medium | **Type:** Edge | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-007
**Category:** GET /admin/audit-log

**Description:** Verify invalid/malformed date range in filter returns 400 Bad Request.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `GET /admin/audit-log?from=invalid-date&to=2026-07-07` with Admin Bearer token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response body:
```json
{
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

**Priority:** High | **Type:** Negative | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-008
**Category:** GET /admin/audit-log

**Description:** Verify pagination boundary: requesting empty data for pages out of bounds.

**Preconditions:**
1. Admin logged in.
2. System has exactly 10 audit logs.

**Input / Steps:**
1. Send `GET /admin/audit-log?page=2&limit=10` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. `data` is empty array `[]`.
3. `pagination` block: `{"page": 2, "total_pages": 1, "total_records": 10}`.

**Priority:** Medium | **Type:** Edge | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-009
**Category:** GET /admin/audit-log

**Description:** Verify that a Marketing Executive is blocked from accessing the audit log.

**Preconditions:**
1. User logged in as Marketing Executive (`me-001`) with valid JWT.

**Input / Steps:**
1. Send `GET /admin/audit-log` with Marketing Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response body:
```json
{
  "success": false,
  "message": "Access denied. Admins only."
}
```

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1, TASK-5.2.1-03

---

### test-ep-5.2.1-b-010
**Category:** GET /admin/audit-log

**Description:** Verify 401 Unauthorized when requesting audit logs with no authentication token.

**Preconditions:**
1. Request header does not contain an Authorization field.

**Input / Steps:**
1. Send `GET /admin/audit-log` without headers.

**Expected Result:**
1. HTTP 401 Unauthorized.

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1

---

## 2. GET /admin/audit-log/:id

### test-ep-5.2.1-b-011
**Category:** GET /admin/audit-log/:id

**Description:** Verify that an Admin can retrieve details of a single audit log entry by ID.

**Preconditions:**
1. Admin logged in.
2. An audit log entry exists in the `audit_logs` table with ID `e0b0e513-ef9f-4318-8097-f0bb26922f30` capturing a role change action.

**Input / Steps:**
1. Send `GET /admin/audit-log/e0b0e513-ef9f-4318-8097-f0bb26922f30` with Admin token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "id": "e0b0e513-ef9f-4318-8097-f0bb26922f30",
    "seq": 1,
    "actor": {
      "id": "actor-uuid-1",
      "name": "Admin User",
      "role": "Admin"
    },
    "action_type": "user.role_changed",
    "entity_affected": "user",
    "entity_id": "user-uuid-1",
    "result": "success",
    "ip_address": "203.0.113.45",
    "details": {
      "old_role": "Marketing",
      "new_role": "Admin"
    },
    "created_at": "2026-07-07T12:00:00Z"
  }
}
```

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1

---

### test-ep-5.2.1-b-012
**Category:** GET /admin/audit-log/:id

**Description:** Verify 404 error when seeking a non-existent or invalid audit log ID.

**Preconditions:**
1. Admin logged in.
2. UUID `ffffffff-ffff-ffff-ffff-ffffffffffff` does not exist in `audit_logs`.

**Input / Steps:**
1. Send `GET /admin/audit-log/ffffffff-ffff-ffff-ffff-ffffffffffff` with Admin token.

**Expected Result:**
1. HTTP 404 Not Found.
2. Response body:
```json
{
  "success": false,
  "message": "Audit log entry not found"
}
```

**Priority:** High | **Type:** Negative | **Traceability:** STORY-5.2.1

---

### test-ep-5.2.1-b-013
**Category:** GET /admin/audit-log/:id

**Description:** Verify 404 (mapped or rejected) when the ID parameter is not a valid UUID format.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `GET /admin/audit-log/invalid-uuid-format` with Admin token.

**Expected Result:**
1. HTTP 404 Not Found.
2. Response body:
```json
{
  "success": false,
  "message": "Audit log entry not found"
}
```

**Priority:** Medium | **Type:** Negative | **Traceability:** STORY-5.2.1

---

### test-ep-5.2.1-b-014
**Category:** GET /admin/audit-log/:id

**Description:** Verify that a Marketing Executive is blocked from viewing a single audit log entry.

**Preconditions:**
1. User logged in as Marketing Executive (`me-001`).
2. Audit log entry with ID `e0b0e513-ef9f-4318-8097-f0bb26922f30` exists.

**Input / Steps:**
1. Send `GET /admin/audit-log/e0b0e513-ef9f-4318-8097-f0bb26922f30` with Marketing token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response body:
```json
{
  "success": false,
  "message": "Access denied. Admins only."
}
```

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1

---

### test-ep-5.2.1-b-015
**Category:** GET /admin/audit-log/:id

**Description:** Verify 401 Unauthorized when requesting detailed log details without a token.

**Preconditions:**
1. No authentication headers.

**Input / Steps:**
1. Send `GET /admin/audit-log/e0b0e513-ef9f-4318-8097-f0bb26922f30` without headers.

**Expected Result:**
1. HTTP 401 Unauthorized.

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1

---

## 3. GET /admin/audit-log/export

### test-ep-5.2.1-b-016
**Category:** GET /admin/audit-log/export

**Description:** Verify Admin can export filtered audit log records as a CSV stream.

**Preconditions:**
1. Admin logged in.
2. Database contains logs matching filter conditions.

**Input / Steps:**
1. Send `GET /admin/audit-log/export?actor=&action_type=&entity=&from=2026-01-01&to=2026-07-07&format=csv` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Response headers: `Content-Type: text/csv` (or with filename in `Content-Disposition`).
3. Body contains comma-separated entries starting with header row: `id,seq,actor_id,actor_name,actor_role,action_type,entity_affected,entity_id,result,ip_address,created_at`.
4. Records in stream match filters.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-04

---

### test-ep-5.2.1-b-017
**Category:** GET /admin/audit-log/export

**Description:** Verify 400 Bad Request when requesting an invalid format other than csv.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `GET /admin/audit-log/export?format=pdf` with Admin Bearer token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response body:
```json
{
  "success": false,
  "message": "Format must be csv"
}
```

**Priority:** High | **Type:** Negative | **Traceability:** STORY-5.2.1, TASK-5.2.1-04

---

### test-ep-5.2.1-b-018
**Category:** GET /admin/audit-log/export

**Description:** Verify 404 when no records match the applied filters for export.

**Preconditions:**
1. Admin logged in.
2. System has no audit logs for the actor `'nonexistent'`.

**Input / Steps:**
1. Send `GET /admin/audit-log/export?actor=nonexistent&format=csv` with Admin Bearer token.

**Expected Result:**
1. HTTP 404 Not Found.
2. Response body:
```json
{
  "success": false,
  "message": "No audit log entries found for the given filters"
}
```

**Priority:** High | **Type:** Negative | **Traceability:** STORY-5.2.1, TASK-5.2.1-04

---

### test-ep-5.2.1-b-019
**Category:** GET /admin/audit-log/export

**Description:** Verify Marketing Executives are blocked from exporting audit logs.

**Preconditions:**
1. User logged in as Marketing Executive (`me-001`).

**Input / Steps:**
1. Send `GET /admin/audit-log/export?format=csv` with Marketing Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response body:
```json
{
  "success": false,
  "message": "Access denied. Admins only."
}
```

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1, TASK-5.2.1-04

---

### test-ep-5.2.1-b-020
**Category:** GET /admin/audit-log/export

**Description:** Verify 401 Unauthorized when requesting export without token.

**Preconditions:**
1. No auth headers.

**Input / Steps:**
1. Send `GET /admin/audit-log/export?format=csv` without authorization.

**Expected Result:**
1. HTTP 401 Unauthorized.

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1

---

## 4. GET /admin/system-settings/audit-retention

### test-ep-5.2.1-b-021
**Category:** GET /admin/system-settings/audit-retention

**Description:** Verify Admin can fetch the current configuration of the audit log retention policy.

**Preconditions:**
1. Admin logged in.
2. System settings has `audit_log_retention_months` default value set to 12.

**Input / Steps:**
1. Send `GET /admin/system-settings/audit-retention` with Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "data": {
    "key": "audit_log_retention_months",
    "value": "12",
    "description": "Months an audit record stays in active storage before archival"
  }
}
```

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

### test-ep-5.2.1-b-022
**Category:** GET /admin/system-settings/audit-retention

**Description:** Verify Marketing Executives are blocked from viewing the retention policy setting.

**Preconditions:**
1. Marketing user (`me-001`) logged in.

**Input / Steps:**
1. Send `GET /admin/system-settings/audit-retention` with Marketing token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{"success":false,"message":"Access denied. Admins only."}`

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

## 5. PUT /admin/system-settings/audit-retention

### test-ep-5.2.1-b-023
**Category:** PUT /admin/system-settings/audit-retention

**Description:** Verify Admin can update the audit retention policy window to a valid positive integer.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `PUT /admin/system-settings/audit-retention` with body `{"value":"18"}` and Admin Bearer token.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "message": "Retention policy updated",
  "data": {
    "key": "audit_log_retention_months",
    "value": "18",
    "updated_at": ""
  }
}
```
3. Subsequent `GET /admin/system-settings/audit-retention` returns `"value": "18"`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

### test-ep-5.2.1-b-024
**Category:** PUT /admin/system-settings/audit-retention

**Description:** Verify 400 Bad Request when setting a non-numeric retention value.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `PUT /admin/system-settings/audit-retention` with body `{"value":"abc"}` and Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response body:
```json
{
  "success": false,
  "message": "Retention period must be a positive integer (months)"
}
```
3. Configuration in system settings table remains unchanged.

**Priority:** High | **Type:** Negative | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

### test-ep-5.2.1-b-025
**Category:** PUT /admin/system-settings/audit-retention

**Description:** Verify 400 Bad Request when setting a negative or zero retention value.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `PUT /admin/system-settings/audit-retention` with body `{"value":"-5"}` and Admin token.

**Expected Result:**
1. HTTP 400 Bad Request.
2. Response body:
```json
{
  "success": false,
  "message": "Retention period must be a positive integer (months)"
}
```

**Priority:** High | **Type:** Negative | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

### test-ep-5.2.1-b-026
**Category:** PUT /admin/system-settings/audit-retention

**Description:** Verify Marketing Executives cannot change the audit retention policy.

**Preconditions:**
1. Marketing user (`me-001`) logged in.

**Input / Steps:**
1. Send `PUT /admin/system-settings/audit-retention` with body `{"value":"6"}` and Marketing token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{"success":false,"message":"Access denied. Admins only."}`

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

## 6. POST /admin/audit-log/archive

### test-ep-5.2.1-b-027
**Category:** POST /admin/audit-log/archive

**Description:** Verify that the system-triggered archival job identifies logs older than the configured retention policy, copies them to archive storage, and removes them from the active storage.

**Preconditions:**
1. Admin (system context / scheduled agent) credentials initialized.
2. Active retention policy setting is 12 months.
3. Today's date is `2026-07-07`.
4. `audit_logs` has:
   - 342 records created before `2025-07-07` (older than 12 months).
   - 100 records created after `2025-07-07` (within active window).

**Input / Steps:**
1. Trigger `POST /admin/audit-log/archive` with body `{"triggered_by":"scheduled_job"}` and system credentials.

**Expected Result:**
1. HTTP 200 OK.
2. Response body:
```json
{
  "success": true,
  "message": "Archival completed",
  "archived_count": 342,
  "retention_months": 12,
  "cutoff_date": "2025-07-07"
}
```
3. Database Verification:
   - `audit_logs` table has exactly 100 rows left.
   - `audit_logs_archive` table has the 342 archived records added.
   - The archived records match original records fields exactly.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

### test-ep-5.2.1-b-028
**Category:** POST /admin/audit-log/archive

**Description:** Verify archival job behaves correctly when zero records qualify for archival.

**Preconditions:**
1. Retention policy = 12 months. Today is `2026-07-07`.
2. All audit logs in active DB were created after `2025-07-07` (none older than 12 months).

**Input / Steps:**
1. Trigger `POST /admin/audit-log/archive` with `{"triggered_by":"scheduled_job"}`.

**Expected Result:**
1. HTTP 200 OK.
2. Response:
```json
{
  "success": true,
  "message": "Archival completed",
  "archived_count": 0,
  "retention_months": 12,
  "cutoff_date": "2025-07-07"
}
```
3. No entries are removed from active table or added to archive table.

**Priority:** Medium | **Type:** Edge | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

### test-ep-5.2.1-b-029
**Category:** POST /admin/audit-log/archive

**Description:** Verify Marketing Executives cannot manually trigger the archival job.

**Preconditions:**
1. Marketing user (`me-001`) logged in.

**Input / Steps:**
1. Send `POST /admin/audit-log/archive` with Marketing Bearer token.

**Expected Result:**
1. HTTP 403 Forbidden.
2. Response: `{"success":false,"message":"Access denied. Admins only."}`

**Priority:** High | **Type:** Security | **Traceability:** STORY-5.2.1, TASK-5.2.1-05

---

## 7. Action Instrumentation & Transaction Validation

### test-ep-5.2.1-b-030
**Category:** Action Instrumentation (User Login)

**Description:** Verify successful login creates an audit log entry within the same database transaction.

**Preconditions:**
1. Valid user credentials (`admin-001` / `password123`) exist.

**Input / Steps:**
1. Send `POST /auth/login` with credentials.
2. Query `audit_logs` for the latest record.

**Expected Result:**
1. HTTP 200 OK.
2. A new entry exists in the `audit_logs` table with:
   - `action_type = 'user.login'`
   - `actor = <admin-001-uuid>`
   - `entity_affected = 'user'`
   - `entity_id = <admin-001-uuid>`
   - `result = 'success'`
   - `ip_address` recorded correctly.
   - `details` contains login success information.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-031
**Category:** Action Instrumentation (User Login Failure)

**Description:** Verify failed login attempt creates an audit log entry.

**Input / Steps:**
1. Send `POST /auth/login` with bad password for existing username `admin-001`.
2. Query `audit_logs` for the latest record.

**Expected Result:**
1. HTTP 401 Unauthorized.
2. A new entry exists in `audit_logs` with:
   - `action_type = 'user.login_failed'`
   - `actor = NULL` (or fallback ID if anonymous)
   - `entity_affected = 'user'`
   - `entity_id = <admin-001-uuid>`
   - `result = 'failure'`
   - `ip_address` is captured.
   - `details` logs reason (e.g. invalid password).

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-032
**Category:** Action Instrumentation (User Logout)

**Description:** Verify logout event writes to audit logs.

**Preconditions:**
1. User logged in.

**Input / Steps:**
1. Send `POST /auth/logout` with Bearer token.
2. Check `audit_logs`.

**Expected Result:**
1. HTTP 200 OK.
2. A new entry exists in `audit_logs` with `action_type = 'user.logout'`, `actor = <user-uuid>`, `result = 'success'`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-033
**Category:** Action Instrumentation (User Create)

**Description:** Verify that creating a user writes an audit log entry inside the same database transaction.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `POST /admin/users` with valid new user payload.

**Expected Result:**
1. HTTP 201 Created.
2. `audit_logs` has a row with `action_type = 'user.created'`, `actor = <admin-uuid>`, `entity_affected = 'user'`, `entity_id = <new-user-uuid>`, `result = 'success'`.
3. Check database to ensure both user record and audit record were written successfully.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-034
**Category:** Action Instrumentation (User Update)

**Description:** Verify that updating user details writes an audit log entry.

**Preconditions:**
1. Admin logged in. User `me-001` exists.

**Input / Steps:**
1. Send `PUT /admin/users/{me-001-id}` with modified fields (e.g., name changed).

**Expected Result:**
1. HTTP 200 OK.
2. `audit_logs` has a row with `action_type = 'user.updated'`, `actor = <admin-uuid>`, `entity_affected = 'user'`, `entity_id = {me-001-id}`, `result = 'success'`, `details` containing updated fields.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-035
**Category:** Action Instrumentation (User Delete)

**Description:** Verify that deleting a user writes an audit log entry.

**Preconditions:**
1. Admin logged in. Temp user exists.

**Input / Steps:**
1. Send `DELETE /admin/users/{temp-user-id}`.

**Expected Result:**
1. HTTP 200 OK.
2. `audit_logs` has a row with `action_type = 'user.deleted'`, `entity_affected = 'user'`, `entity_id = {temp-user-id}`, `result = 'success'`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-036
**Category:** Action Instrumentation (Role Change)

**Description:** Verify role change records changes to audit logs showing old and new roles.

**Preconditions:**
1. Admin logged in. User `me-001` has role `'Marketing'`.

**Input / Steps:**
1. Send `PUT /admin/users/{me-001-uuid}/role` (or general user update) changing role to `'Admin'`.

**Expected Result:**
1. HTTP 200 OK.
2. `audit_logs` has a row with `action_type = 'user.role_changed'`, `entity_affected = 'user'`, `entity_id = {me-001-uuid}`, `result = 'success'`, `details = {"old_role": "Marketing", "new_role": "Admin"}`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-037
**Category:** Action Instrumentation (Lead Assignment)

**Description:** Verify lead assignment records to audit logs.

**Preconditions:**
1. Admin logged in. Lead A is unassigned.

**Input / Steps:**
1. Send `PATCH /admin/leads/{leadA-id}/assign` with body `{"assigned_to":"me-002-uuid"}`.

**Expected Result:**
1. HTTP 200 OK.
2. `audit_logs` table has a row with `action_type = 'lead.assigned'`, `entity_affected = 'lead'`, `entity_id = leadA-uuid`, `result = 'success'`, `details` contains reassignment metadata.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-038
**Category:** Action Instrumentation (Category Create)

**Description:** Verify business category creation writes to audit logs.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `POST /admin/categories` with body `{"category_name":"IT Services"}`.

**Expected Result:**
1. HTTP 201 Created.
2. `audit_logs` table contains `action_type = 'category.created'`, `entity_affected = 'category'`, `result = 'success'`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-039
**Category:** Action Instrumentation (Category Update)

**Description:** Verify updating a business category writes to audit logs.

**Preconditions:**
1. Admin logged in. Category exists.

**Input / Steps:**
1. Send `PUT /admin/categories/{cat-id}` with body `{"category_name":"Software Development"}`.

**Expected Result:**
1. HTTP 200 OK.
2. `audit_logs` contains `action_type = 'category.updated'`, `entity_affected = 'category'`, `entity_id = cat-id`, `result = 'success'`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-040
**Category:** Action Instrumentation (Category Delete)

**Description:** Verify deleting a business category writes to audit logs.

**Preconditions:**
1. Admin logged in. Temp category exists.

**Input / Steps:**
1. Send `DELETE /admin/categories/{temp-cat-id}`.

**Expected Result:**
1. HTTP 200 OK.
2. `audit_logs` contains `action_type = 'category.deleted'`, `entity_affected = 'category'`, `entity_id = temp-cat-id`, `result = 'success'`.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-041
**Category:** Action Instrumentation (Transaction Atomicity - Database Fallback)

**Description:** Verify transaction atomicity — if user creation fails due to validation or database constraints, no audit log row is created.

**Preconditions:**
1. Admin logged in.

**Input / Steps:**
1. Send `POST /admin/users` with payload missing required fields (e.g. missing password) to trigger validation error before SQL write.
2. Check `audit_logs` for any entry.

**Expected Result:**
1. HTTP 400 Bad Request.
2. No new row is inserted into the `audit_logs` table (operation rolled back / never occurred).

**Priority:** High | **Type:** Transaction | **Traceability:** STORY-5.2.1, TASK-5.2.1-02

---

### test-ep-5.2.1-b-042
**Category:** Action Instrumentation (Transaction Atomicity - Log Insert Failure)

**Description:** Verify transaction atomicity — if insertion to `audit_logs` fails (e.g. database constraint trigger mock), the parent user action (e.g., category creation) is rolled back, preventing orphaned modifications.

**Preconditions:**
1. Admin logged in.
2. Mock or force a failure on writing to `audit_logs` table (e.g., locking table or mock constraint violation).

**Input / Steps:**
1. Send `POST /admin/categories` with body `{"category_name":"Automated Systems"}`.

**Expected Result:**
1. HTTP 500 Internal Server Error (or failure code).
2. Database check:
   - No category named "Automated Systems" exists in `business_categories` table (the category insertion was rolled back).
   - No log entry is written to `audit_logs` table.
3. System status remains clean and atomic.

**Priority:** High | **Type:** Transaction | **Traceability:** STORY-5.2.1, TASK-5.2.1-02
