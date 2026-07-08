# EPIC-5: Lead Audit & Change Tracking — Frontend Test Cases (STORY-5.1.1: Lead Field Change History)

> **Epic Goal:** Provide full traceability of lead data changes for compliance and audit purposes.
> **Story Goal:** As an Admin, I want every change to a lead's key fields tracked so that I have full traceability of who changed what and when.
> **Tech Stack:** React (Vite) / TailwindCSS / Vitest / React Testing Library
> **Total Test Cases:** 26

---

## Table of Contents
1. [History Tab — Table Display](#1-history-tab--table-display)
2. [History Tab — Load More & Filter by Field Name](#2-history-tab--load-more--filter-by-field-name)
3. [System- vs User-Initiated Distinction](#3-system--vs-user-initiated-distinction)
4. [Read-Only / Append-Only Feed (Immutability)](#4-read-only--append-only-feed-immutability)
5. [Close Lead as Won/Lost UI](#5-close-lead-as-wonlost-ui)
6. [Reopen Lead UI (Admin)](#6-reopen-lead-ui-admin)
7. [CSV Export](#7-csv-export)
8. [Audit Log Page](#8-audit-log-page)
9. [Accessibility & Resilience](#9-accessibility--resilience)

---

## 1. History Tab — Table Display

Consumes `GET /admin/leads/:id/field-history` (Admin) or `GET /marketing/leads/:id/field-history` (ME).

---

**Test ID**
test-ep-5.1.1-f-001

**Category**
History Tab — Table Display

**Description**
History tab renders table with DB column labels: field_name, old_value, new_value, changed_by_name, changed_at.

**Preconditions**
1. User logged in as Admin.
2. Navigate to `/admin/leads/{leadId}`.
3. API returns 3 `lead_history` entries: field_name = 'stage', old_value = 'New', new_value = 'Contacted'; field_name = 'assigned_to', old_value = '', new_value = 'John'; field_name = 'lead_quality', old_value = 'Cold', new_value = 'Hot'.

**Input / Steps**
1. Click "History" tab on the Lead Detail page.

**Expected Result**
1. Table renders with columns: "Field Name", "Old Value", "New Value", "Changed By", "Changed At".
2. Exactly 3 data rows visible.
3. Each row displays `field_name` (human-readable), `old_value`, `new_value`, `changed_by.name`, `changed_at` (formatted).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

**Test ID**
test-ep-5.1.1-f-002

**Category**
History Tab — Table Display

**Description**
History entries displayed in newest-first order by changed_at.

**Preconditions**
1. Lead has 5 entries in `lead_history` spanning 3 days with ascending `changed_at` values.

**Input / Steps**
1. Open History tab.

**Expected Result**
1. Most recent `changed_at` appears as first row.
2. Oldest `changed_at` appears as last row.
3. Timestamps strictly decrease top-to-bottom.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

**Test ID**
test-ep-5.1.1-f-003

**Category**
History Tab — Table Display

**Description**
History tab accessible from both Admin and Marketing Executive lead detail pages.

**Preconditions**
1. Auth context set to Admin role (test scenario A).
2. Auth context set to ME role (test scenario B via re-render with different auth mock).

**Input / Steps**
1. Scenario A (Admin): render `LeadDetails` with Admin user → click History tab.
2. Scenario B (ME): re-render `LeadDetails` with ME user → click History tab.

**Expected Result**
1. Both roles see the History tab button.
2. Both see the same table with columns: "Field Name", "Old Value", "New Value", "Changed By", "Changed At".

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

**Test ID**
test-ep-5.1.1-f-004

**Category**
History Tab — Table Display

**Description**
Field names displayed as human-readable labels derived from DB column field_name.

**Preconditions**
1. History tab loaded with entries where `field_name` = `stage`, `assigned_to`, `lead_quality`.

**Input / Steps**
1. Observe "Field Name" column values.

**Expected Result**
1. `stage` displays as "Stage".
2. `assigned_to` displays as "Assigned To".
3. `lead_quality` displays as "Lead Quality".
4. Labels are derived from `field_name` via a display utility converting snake_case to Title Case with spaces.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

**Test ID**
test-ep-5.1.1-f-005

**Category**
History Tab — Table Display

**Description**
Long old_value/new_value text truncated with expand/collapse toggle.

**Preconditions**
1. History entry has `new_value` of 200+ characters.

**Input / Steps**
1. Observe "New Value" cell — text appears truncated with ellipsis.
2. Click "Show more" link.

**Expected Result**
1. Cell shows truncated preview (first ~100 chars) with "Show more" link appended.
2. Clicking "Show more" expands to full value inline.
3. Clicking "Show less" collapses it back to truncated preview.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

**Test ID**
test-ep-5.1.1-f-006

**Category**
History Tab — Table Display

**Description**
Total changes count badge displayed from lead_history entries.

**Preconditions**
1. API returns `total_changes: 12`.

**Input / Steps**
1. Open History tab.

**Expected Result**
1. Badge or text displays "Total Changes: 12".
2. Count matches `total_changes` from API response.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

> **Tip:** Loading, empty, and error states for the History tab are covered in [test-ep-5.1.1-f-023](#9-accessibility--resilience).

---

## 2. History Tab — Load More & Filter by Field Name

Consumes `GET /admin/leads/:id/field-history` (Admin) or `GET /marketing/leads/:id/field-history` (ME) with `?page=` and `?field_name=` query params.

**Test ID**
test-ep-5.1.1-f-007

**Category**
History Tab — Load More & Filter

**Description**
Paginated history supports "Load more" when entries exceed initial page limit.

**Preconditions**
1. Lead has 25 entries in `lead_history`.
2. API returns 20 entries on page 1 with `hasMore: true`.

**Input / Steps**
1. Open History tab.
2. Observe table rows count.
3. Click "Load more" button.

**Expected Result**
1. 20 rows displayed initially.
2. "Load more" button visible below table.
3. Clicking "Load more" appends remaining 5 entries.
4. "Load more" disappears after all 25 entries loaded.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

**Test ID**
test-ep-5.1.1-f-008

**Category**
History Tab — Load More & Filter

**Description**
Filter by field_name — only entries matching selected field_name shown.

**Preconditions**
1. History tab loaded with entries for `field_name` values: `stage` (3), `assigned_to` (2), `lead_quality` (1).

**Input / Steps**
1. Select "stage" from field_name filter dropdown.

**Expected Result**
1. Only 3 rows with `field_name = 'stage'` displayed.
2. Other field entries hidden.
3. Filter control indicates active state.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-97

---

## 3. System- vs User-Initiated Distinction

**Test ID**
test-ep-5.1.1-f-009

**Category**
System- vs User-Initiated Distinction

**Description**
System-generated changes (changed_by_name = "System") visually distinguished from user changes.

**Preconditions**
1. History has 2 user entries and 1 system entry (`changed_by_name = 'System'`).

**Input / Steps**
1. Observe "Changed By" column.

**Expected Result**
1. System entry displays "System" with muted/grey text.
2. "System" badge rendered with neutral styling.
3. User entries display actual user name with standard styling.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-99

---

**Test ID**
test-ep-5.1.1-f-010

**Category**
System- vs User-Initiated Distinction

**Description**
Tooltip on "System" badge explains auto-generated source.

**Preconditions**
1. System entry visible.

**Input / Steps**
1. Hover over "System" badge.

**Expected Result**
1. Tooltip appears: "This change was automatically performed by the system."
2. Tooltip disappears on mouse leave.

**Priority (High/Medium/Low)**
Low

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-99

---

**Test ID**
test-ep-5.1.1-f-011

**Category**
System- vs User-Initiated Distinction

**Description**
Filter toggle to show only user-initiated or only system-generated changes.

**Preconditions**
1. History has 5 user entries, 3 system entries.

**Input / Steps**
1. Click "User changes only" toggle.
2. Click "System changes only" toggle.
3. Click "All changes".

**Expected Result**
1. "User changes only" — 5 rows, system hidden.
2. "System changes only" — 3 rows, user hidden.
3. "All changes" — all 8 rows restored.
4. Active filter highlighted.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1, C1-99

---

## 4. Read-Only / Append-Only Feed (Immutability)

**Test ID**
test-ep-5.1.1-f-012

**Category**
Immutability

**Description**
No inline edit controls on any history row — history is append-only.

**Preconditions**
1. Admin logged in.
2. History tab loaded.

**Input / Steps**
1. Inspect each row for edit controls.

**Expected Result**
1. Zero edit controls (no pencil icons, edit buttons, click-to-edit).
2. Cells render as plain text — clicking does not turn them into inputs.
3. No context menu allows modification.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.1.1, C1-100

---

**Test ID**
test-ep-5.1.1-f-013

**Category**
Immutability

**Description**
No delete controls on any history row.

**Preconditions**
1. Admin logged in.
2. History tab loaded.

**Input / Steps**
1. Look for trash icons, delete buttons, "Remove" links.
2. Check for bulk delete checkbox.

**Expected Result**
1. No delete controls present on any row.
2. No bulk delete mechanism exists in History tab.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.1.1, C1-100

---

## 5. Close Lead as Won/Lost UI

**Test ID**
test-ep-5.1.1-f-014

**Category**
Close Lead UI

**Description**
Close lead as Won — form requires final_deal_value and closure_date. History entry created on success.

**Preconditions**
1. ME logged in.
2. Lead has `stage = 'Negotiation'`.
3. Close modal opened.

**Input / Steps**
1. Select "Won" status, submit without final_deal_value.
2. Enter final_deal_value = 250000 and closure_date = 2026-06-30, then submit.

**Expected Result**
1. Without required fields: inline validation error, no API call.
2. With valid fields: API call succeeds, lead displays "Won" stage, history table shows new entry (`field_name = 'stage'`, `old_value = 'Negotiation'`, `new_value = 'Won'`).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

**Test ID**
test-ep-5.1.1-f-015

**Category**
Close Lead UI

**Description**
Close lead as Lost — form requires loss_reason from allowed enum values.

**Preconditions**
1. ME logged in.
2. Lead has `stage = 'Negotiation'`.
3. Close modal opened.

**Input / Steps**
1. Select "Lost" status, submit without loss_reason.
2. Select "Budget" as loss_reason, then submit.

**Expected Result**
1. Without loss_reason: validation error, no API call.
2. With valid loss_reason: API call succeeds, lead displays "Lost" stage, history table updates with new entry (`field_name = 'stage'`, `old_value = 'Negotiation'`, `new_value = 'Lost'`).

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

**Test ID**
test-ep-5.1.1-f-016

**Category**
Close Lead UI

**Description**
Non-assigned user cannot see close button on lead detail page.

**Preconditions**
1. ME logged in.
2. Lead assigned to different user.

**Input / Steps**
1. Navigate to lead detail page.

**Expected Result**
1. No "Close Lead" button rendered.
2. Attempting to call close API manually shows error toast.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.1.1

---

## 6. Reopen Lead UI (Admin)

**Test ID**
test-ep-5.1.1-f-017

**Category**
Reopen Lead UI

**Description**
Admin can reopen a Won/Lost lead with reopen_reason. History entry created on success.

**Preconditions**
1. Admin logged in.
2. Lead has `stage = 'Won'`.
3. Reopen modal opened.

**Input / Steps**
1. Submit without reopen_reason.
2. Enter reopen_reason = "Client expressed renewed interest", then submit.

**Expected Result**
1. Without reason: validation error, no API call.
2. With reason: success, lead stage changes to "Contacted", history shows new entry with `field_name = 'stage'`, `old_value = 'Won'`, `new_value = 'Contacted'`, `reason = 'Client expressed renewed interest'`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

## 7. CSV Export

**Test ID**
test-ep-5.1.1-f-018

**Category**
CSV Export

**Description**
"Export CSV" button visible on History tab for Admins, hidden for MEs.

**Preconditions**
1. Admin logged in (scenario A).
2. ME logged in (scenario B).

**Input / Steps**
1. Admin: observe History tab top-right area.
2. ME: observe History tab.

**Expected Result**
1. Admin sees "Export CSV" button with download icon.
2. ME sees no export button.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Security

**Traceability**
STORY-5.1.1

---

**Test ID**
test-ep-5.1.1-f-019

**Category**
CSV Export

**Description**
Clicking "Export CSV" triggers GET request with format=csv and downloads file.

**Preconditions**
1. Admin logged in.
2. History tab loaded.

**Input / Steps**
1. Click "Export CSV".

**Expected Result**
1. GET request dispatched to `/admin/leads/{leadId}/field-history/export?format=csv`.
2. File download triggered with `.csv` filename.
3. Success toast or loading indicator shown during download.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

## 8. Audit Log Page

**Test ID**
test-ep-5.1.1-f-020

**Category**
Audit Log Page

**Description**
Admin audit log page renders table with columns matching DB: action, resource, resource_id, user (email), details, ip_address, created_at.

**Preconditions**
1. Admin logged in.
2. Navigate to `/admin/audit-log`.
3. API returns 50 entries.

**Input / Steps**
1. Observe the audit log table.

**Expected Result**
1. Table columns: "Action", "Resource", "Resource ID", "User", "Details", "IP Address", "Timestamp".
2. 50 rows rendered.
3. Each row maps to DB columns: `action`, `resource`, `resource_id`, `email` (from users join), `details`, `ip_address`, `created_at`.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

**Test ID**
test-ep-5.1.1-f-021

**Category**
Audit Log Page

**Description**
Audit log filter controls for user_id, action, resource, and date range.

**Preconditions**
1. Admin logged in.
2. Audit log page loaded.

**Input / Steps**
1. Select action filter "lead.status_changed".
2. Set date range: from = 2026-06-01, to = 2026-06-26.
3. Click "Apply".

**Expected Result**
1. Table refreshes with only matching entries.
2. Filter controls show active state.
3. URL query params updated.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

**Test ID**
test-ep-5.1.1-f-022

**Category**
Audit Log Page

**Description**
Clicking an audit log row navigates to detail view showing full entry data.

**Preconditions**
1. Admin logged in.
2. Audit log page loaded.

**Input / Steps**
1. Click a row in the audit log table.

**Expected Result**
1. Navigate to `/admin/audit-log/{id}` detail view.
2. Detail view displays: `id`, `action`, `resource`, `resource_id`, `user_id`, `email`, `details` (formatted JSON), `ip_address`, `result`, `created_at`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Positive

**Traceability**
STORY-5.1.1

---

## 9. Accessibility & Resilience

**Test ID**
test-ep-5.1.1-f-023

**Category**
Accessibility & Resilience

**Description**
Loading, empty, and error states for History tab.

**Preconditions**
1. Admin logged in.
2. Three scenarios: loading (1.5s delay), empty (`total_changes: 0`), error (500).

**Input / Steps**
1. Open History tab — observe loading state.
2. Simulate empty response — observe empty state.
3. Simulate 500 error — observe error state.

**Expected Result**
1. Loading: skeleton/placeholder rows displayed while fetching.
2. Empty: "No changes tracked yet" message with icon, no table rendered.
3. Error: inline error message with retry button, rest of page remains interactive.

**Priority (High/Medium/Low)**
High

**Type (Positive/Negative/Edge/Security/Accessibility)**
Edge

**Traceability**
STORY-5.1.1

---

**Test ID**
test-ep-5.1.1-f-024

**Category**
Accessibility & Resilience

**Description**
Keyboard navigation and ARIA labels across History tab.

**Preconditions**
1. History tab loaded with data.

**Input / Steps**
1. Tab through History tab button, Export CSV (if Admin), table headers, and interactive elements.
2. Inspect ARIA attributes.

**Expected Result**
1. Tab order follows logical sequence.
2. All interactive elements receive visible focus ring.
3. Table has `role="table"` and `aria-label`.
4. Column headers have `scope="col"`.
5. Export CSV button has `aria-label`.

**Priority (High/Medium/Low)**
Medium

**Type (Positive/Negative/Edge/Security/Accessibility)**
Accessibility

**Traceability**
STORY-5.1.1

---

---

### test-ep-5.1.1-f-025
**Category:** History Tab — Table Display (Tab Switching)

**Description:** History tab triggers a fetch request when clicked/selected, and data loads only after tab is active.

**Preconditions:**
1. User logged in as Admin.
2. Navigate to `/admin/leads/{leadId}` — Timeline tab is the default active tab.
3. Mock the `/field-history` endpoint to track if it is called.

**Input / Steps:**
1. Observe that no request to `/field-history` is made while the Timeline tab is active.
2. Click the "History" tab.
3. Observe the network request.

**Expected Result:**
1. Before clicking History: no `GET /admin/leads/{leadId}/field-history` request is dispatched.
2. After clicking History: `GET /admin/leads/{leadId}/field-history` is dispatched exactly once.
3. The History tab displays a loading indicator while the request is in flight.
4. Switching back to Timeline and then to History again does NOT re-fetch if data is already cached.

**Priority:** High | **Type:** Positive | **Traceability:** STORY-5.1.1, C1-97

---

### test-ep-5.1.1-f-026
**Category:** History Tab — Load More & Filter (Edge Cases)

**Description:** When total entries equal exactly the page limit, no "Load more" button appears.

**Preconditions:**
1. Admin logged in.
2. Lead has exactly 20 entries in `lead_history`.
3. API returns 20 entries on page 1 with `hasMore: false`.

**Input / Steps:**
1. Open History tab.

**Expected Result:**
1. Exactly 20 rows displayed.
2. No "Load more" button rendered below the table.
3. Pagination info displays "Showing all 20 changes".

**Priority:** Medium | **Type:** Edge | **Traceability:** STORY-5.1.1, C1-97

---

> **End of Frontend Test Cases for STORY-5.1.1** — Total: 26 test cases
