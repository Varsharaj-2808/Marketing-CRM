---
jira-key: C1-96
issue-type: Story
status: To Do
updated: 2026-06-26 05:14:48
---

# C1-96: [STORY-5.1.1] As an Admin, I want every change to a lead's key fields tracked so that I have full traceability of who changed what and when....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:14:48 |
| Updated | 2026-06-26 05:14:48 |
| Labels | EPIC-5, Field-Level-Change-History |


## Description

User Story:

As an Admin, I want every change to a lead's key fields tracked so that I have full traceability of who changed what and when.

Acceptance Criteria:

Given any tracked field on a Lead is changed and saved, then a History row is created capturing: field name, old value, new value, actor, and timestamp — written in the same transaction as the field update so the two can never be out of sync.

Given a user attempts to call any update/delete endpoint against the History table directly, then the API rejects the request (History is insert-only at the database and API layer).

Given an Admin opens the History tab on a Lead, then entries are listed newest-first and clearly distinguish system-generated entries (e.g., auto stage validation) from user-initiated ones.

Given an Admin exports History for a lead, then the exported file matches exactly what is shown on screen at the time of export, in CSV format.


## Acceptance Criteria

Given any tracked field on a Lead is changed and saved, then a History row is created capturing: field name, old value, new value, actor, and timestamp — written in the same transaction as the field update so the two can never be out of sync.

Given a user attempts to call any update/delete endpoint against the History table directly, then the API rejects the request (History is insert-only at the database and API layer).

Given an Admin opens the History tab on a Lead, then entries are listed newest-first and clearly distinguish system-generated entries (e.g., auto stage validation) from user-initiated ones.

Given an Admin exports History for a lead, then the exported file matches exactly what is shown on screen at the time of export, in CSV format.


## Links

### Parent Epic

- **Key:** C1-95
- **Summary:** [EPIC-5] Lead History & Audit Trail
### Child Issues

- **C1-97:** [TASK-5.1.1-01] Design Lead History table schema (entity, field, old value, new value, actor, timestamp, reason if applicable)- **C1-98:** [TASK-5.1.1-02] Implement change-tracking middleware/hook on Lead update API for tracked fields (Status, Stage, Assigned To, Priority, Category, Sub-Category, Estimated Value)- **C1-99:** [TASK-5.1.1-03] Build 'History' tab on Lead Detail page showing field-level change log- **C1-100:** [TASK-5.1.1-04] Ensure History entries are immutable (insert-only, no update/delete at DB and API level)- **C1-101:** [TASK-5.1.1-05] Add History export (CSV) for Admin



_Last updated: 2026-06-26 05:14:48_
