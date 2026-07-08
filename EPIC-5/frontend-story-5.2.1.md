# EPIC-5: Lead Audit & Change Tracking — Frontend Test Cases (STORY-5.2.1: System-wide Audit Log)

> **Epic Goal:** Provide full traceability of lead data changes and administrative actions for compliance and audit purposes.
> **Story Goal:** As an Admin, I want a system-wide audit log of user actions (logins, user management, assignment, category management) so that I can investigate issues and ensure accountability.
> **Tech Stack:** React (Vite) / TailwindCSS / Vitest / React Testing Library
> **Total Test Cases:** 22

---

## Table of Contents
1. [Audit Log Page Layout & Data Display](#1-audit-log-page-layout--data-display)
2. [Audit Log Filters & Sorting](#2-audit-log-filters--sorting)
3. [Pagination Controls](#3-pagination-controls)
4. [Access Control & Direct URL Access (RBAC)](#4-access-control--direct-url-access-rbac)
5. [CSV Export Functionality](#5-csv-export-functionality)
6. [Audit Log Retention Policy UI](#6-audit-log-retention-policy-ui)

---

## 1. Audit Log Page Layout & Data Display

Consumes `GET /admin/audit-log`.

---

**Test ID**
test-ep-5.2.1-f-001

**Category**
Audit Log Page Layout & Data Display

**Description**
Verify that the Audit Log page renders with the correct column headers and displays data correctly.

**Preconditions**
1. User logged in as Admin.
2. Navigate to `/admin/audit-log`.
3. MSW mock returns 1 audit log entry:
```json
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
```

**Input / Steps**
1. Load `/admin/audit-log` page.

**Expected Result**
1. The table contains headers: "Seq", "Timestamp", "Actor", "Role", "Action Type", "Entity Affected", "Entity ID", "Result", "IP Address", "Actions/Details".
2. The table displays exactly one row matching the mock data.
3. The "Actor" cell displays "Admin User" and the "Role" cell displays "Admin".
4. The "Result" cell displays "success" (e.g. styled with green success badge/text).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-002

**Category**
Audit Log Page Layout & Data Display

**Description**
Verify that the Audit Log table displays entries in newest-first order by default.

**Preconditions**
1. Admin user logged in.
2. MSW mock returns multiple audit entries with varying `created_at` timestamps.

**Input / Steps**
1. Load `/admin/audit-log` page.

**Expected Result**
1. The list displays the entries sorted descending by the `created_at` field (newest at the top).
2. The UI table rows correspond chronologically in descending order.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-003

**Category**
Audit Log Page Layout & Data Display

**Description**
Verify that clicking on the "View details" action button for an audit log row opens a modal containing the full JSON payload or key-value details of the action.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.
2. A row is displayed representing a role change.
3. MSW mock configured to return details for `GET /admin/audit-log/:id`.

**Input / Steps**
1. Click the "View details" button on the role change row.

**Expected Result**
1. A modal dialog pops up.
2. The modal details show `"old_role": "Marketing"` and `"new_role": "Admin"`.
3. Modal displays the actor, action type, IP address, and raw details correctly.
4. Clicking the "Close" button closes the modal.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-004

**Category**
Audit Log Page Layout & Data Display

**Description**
Verify UI behavior when the backend returns no audit logs.

**Preconditions**
1. Admin user logged in.
2. MSW mock returns:
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "total_pages": 0, "total_records": 0 }
}
```

**Input / Steps**
1. Load `/admin/audit-log` page.

**Expected Result**
1. Table displays a placeholder state: "No audit log entries found."
2. No pagination controls are rendered, or they are in a disabled state.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-005

**Category**
Audit Log Page Layout & Data Display

**Description**
Verify UI handles server error gracefully.

**Preconditions**
1. Admin user logged in.
2. MSW mock returns HTTP 500 error for `GET /admin/audit-log`.

**Input / Steps**
1. Load `/admin/audit-log` page.

**Expected Result**
1. An error message banner appears: "Failed to load audit logs. Please try again later."
2. Loading spinner disappears.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-5.2.1

---

## 2. Audit Log Filters & Sorting

---

**Test ID**
test-ep-5.2.1-f-006

**Category**
Audit Log Filters & Sorting

**Description**
Verify filtering logs by Actor name.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.

**Input / Steps**
1. Type "John Doe" into the "Actor" filter input field.
2. Press Enter or click the "Filter" button.

**Expected Result**
1. Page triggers an API call: `GET /admin/audit-log` with query parameter `actor=John+Doe`.
2. Table updates to show only matching records.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-007

**Category**
Audit Log Filters & Sorting

**Description**
Verify filtering logs by Action Type dropdown.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.

**Input / Steps**
1. Select "user.role_changed" from the "Action Type" dropdown list.

**Expected Result**
1. UI triggers API call: `GET /admin/audit-log` with query `action_type=user.role_changed`.
2. Table lists only role change audit entries.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-008

**Category**
Audit Log Filters & Sorting

**Description**
Verify filtering logs by Date Range inputs.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.

**Input / Steps**
1. Enter "2026-01-01" in the "From Date" field.
2. Enter "2026-07-07" in the "To Date" field.
3. Click "Apply Filters".

**Expected Result**
1. UI triggers API call: `GET /admin/audit-log` with queries `from=2026-01-01` and `to=2026-07-07`.
2. List updates accordingly.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-009

**Category**
Audit Log Filters & Sorting

**Description**
Verify validation message displayed on invalid date input formats.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.

**Input / Steps**
1. Enter "invalid-date" in the "From Date" field.
2. Click "Apply Filters".

**Expected Result**
1. API returns HTTP 400 with message "Invalid date format. Use YYYY-MM-DD".
2. UI displays an error alert or inline input validation message: "Invalid date format. Use YYYY-MM-DD".

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-010

**Category**
Audit Log Filters & Sorting

**Description**
Verify resetting all active filters.

**Preconditions**
1. Admin user logged in with filters "Actor = Jane" and "Action = lead.assigned" applied.

**Input / Steps**
1. Click the "Reset Filters" button.

**Expected Result**
1. Filter inputs are cleared.
2. API is called without parameters: `GET /admin/audit-log`.
3. Table displays unfiltered log results.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

## 3. Pagination Controls

---

**Test ID**
test-ep-5.2.1-f-011

**Category**
Pagination Controls

**Description**
Verify pagination navigation handles page transitions and updates the data.

**Preconditions**
1. Admin logged in.
2. MSW mock returns:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "total_pages": 5, "total_records": 250 }
}
```

**Input / Steps**
1. Click the "Next Page" button.

**Expected Result**
1. API is called with `page=2`.
2. Page indicator updates to "Page 2 of 5".
3. Table loads data corresponding to page 2.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

**Test ID**
test-ep-5.2.1-f-012

**Category**
Pagination Controls

**Description**
Verify page transition buttons are disabled at boundary conditions.

**Preconditions**
1. Admin logged in.
2. MSW returns `pagination: { "page": 1, "total_pages": 1, "total_records": 10 }`.

**Input / Steps**
1. Observe the "Previous Page" and "Next Page" buttons.

**Expected Result**
1. Both "Previous Page" and "Next Page" buttons are rendered in a disabled state.
2. Buttons are visually greyed out and do not respond to clicks.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-5.2.1, TASK-5.2.1-03

---

## 4. Access Control & Direct URL Access (RBAC)

---

**Test ID**
test-ep-5.2.1-f-013

**Category**
Access Control & Direct URL Access (RBAC)

**Description**
Verify that a Marketing Executive user does not see the "Audit Log" navigation menu item.

**Preconditions**
1. Log in as Marketing Executive.

**Input / Steps**
1. Open the sidebar navigation menu.

**Expected Result**
1. "Audit Log" navigation item is not visible.
2. "System Settings" navigation item is not visible.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.2.1

---

**Test ID**
test-ep-5.2.1-f-014

**Category**
Access Control & Direct URL Access (RBAC)

**Description**
Verify that a Marketing Executive attempting to access the direct URL of the Audit Log is blocked.

**Preconditions**
1. Log in as Marketing Executive.

**Input / Steps**
1. Enter the direct URL `/admin/audit-log` in the browser address bar.

**Expected Result**
1. Direct access is intercepted.
2. User is redirected to `/marketing/leads` (or dashboard) or displays an "Access Denied" error page.
3. No audit log contents are loaded or rendered.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.2.1

---

## 5. CSV Export Functionality

---

**Test ID**
test-ep-5.2.1-f-015

**Category**
CSV Export Functionality

**Description**
Verify clicking "Export CSV" initiates a file download.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.
2. Filter applied: `actor=John`.

**Input / Steps**
1. Click the "Export CSV" button.

**Expected Result**
1. Browser sends a request to `GET /admin/audit-log/export?actor=John&format=csv`.
2. Download begins. The downloaded file is in CSV format.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-04

---

**Test ID**
test-ep-5.2.1-f-016

**Category**
CSV Export Functionality

**Description**
Verify UI toast notification when exporting filters returning no records.

**Preconditions**
1. Admin user logged in on `/admin/audit-log`.
2. MSW mock configured to return `404` for `GET /admin/audit-log/export?actor=nonexistent`.

**Input / Steps**
1. Type "nonexistent" into the Actor filter field.
2. Click "Export CSV".

**Expected Result**
1. Request is sent.
2. On 404 response, the UI displays a warning toast: "No audit log entries found for the given filters".
3. No blank file is downloaded.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-5.2.1, TASK-5.2.1-04

---

## 6. Audit Log Retention Policy UI

---

**Test ID**
test-ep-5.2.1-f-017

**Category**
Audit Log Retention Policy UI

**Description**
Verify retention settings load and display current config values.

**Preconditions**
1. Admin user logged in.
2. Navigate to System Settings / Retention tab.
3. MSW mock returns:
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

**Input / Steps**
1. Load System Settings Retention page.

**Expected Result**
1. An input box labeled "Audit Log Retention (Months)" displays the value "12".
2. The description field text "Months an audit record stays in active storage before archival" is visible.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-05

---

**Test ID**
test-ep-5.2.1-f-018

**Category**
Audit Log Retention Policy UI

**Description**
Verify Admin can update retention config successfully.

**Preconditions**
1. Admin user on Retention configuration page.
2. MSW mock returns success for `PUT /admin/system-settings/audit-retention` with value "18".

**Input / Steps**
1. Change the value in the retention month input box to "18".
2. Click the "Save Configuration" button.

**Expected Result**
1. PUT request is sent to `/admin/system-settings/audit-retention` with payload `{"value":"18"}`.
2. Success toast message is displayed: "Retention policy updated successfully".
3. Input box maintains value "18".

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.2.1, TASK-5.2.1-05

---

**Test ID**
test-ep-5.2.1-f-019

**Category**
Audit Log Retention Policy UI

**Description**
Verify UI validation handling of non-numeric retention values.

**Preconditions**
1. Admin user on Retention configuration page.

**Input / Steps**
1. Enter "abc" in the retention input box.
2. Click "Save Configuration".

**Expected Result**
1. UI prevents submission or displays validation error message: "Retention period must be a positive integer (months)".
2. No API call is made.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-5.2.1, TASK-5.2.1-05

---

**Test ID**
test-ep-5.2.1-f-020

**Category**
Audit Log Retention Policy UI

**Description**
Verify UI validation handling of negative/zero retention values.

**Preconditions**
1. Admin user on Retention configuration page.

**Input / Steps**
1. Enter "-5" or "0" in the retention input box.
2. Click "Save Configuration".

**Expected Result**
1. UI validation prevents API dispatch and displays error message: "Retention period must be a positive integer (months)".

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Negative

**Traceability**
STORY-5.2.1, TASK-5.2.1-05

---

**Test ID**
test-ep-5.2.1-f-021

**Category**
Audit Log Retention Policy UI

**Description**
Verify that a Marketing Executive user cannot see or modify the retention configuration settings.

**Preconditions**
1. Log in as Marketing Executive user.

**Input / Steps**
1. Attempt direct navigation to `/admin/system-settings/audit-retention` or open System Settings layout.

**Expected Result**
1. User is redirected to `/marketing/leads` dashboard.
2. Settings screen is inaccessible.
3. No configuration values are rendered.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.2.1, TASK-5.2.1-05

---

**Test ID**
test-ep-5.2.1-f-022

**Category**
Audit Log Retention Policy UI

**Description**
Verify retention settings loading screen and error states.

**Preconditions**
1. Admin user on Retention configuration page.
2. MSW mock returns network error / timeout.

**Input / Steps**
1. Refresh the settings page.

**Expected Result**
1. An inline warning banner is displayed: "Failed to load retention settings".
2. Save button is disabled.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-5.2.1
