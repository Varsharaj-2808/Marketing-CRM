---
jira-key: C1-102
issue-type: Story
status: To Do
updated: 2026-06-26 05:14:54
---

# C1-102: [STORY-5.2.1] As an Admin, I want a system-wide audit log of user actions (logins, user management, assignment, category management) so that I can investigate issue...

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:14:54 |
| Updated | 2026-06-26 05:14:54 |
| Labels | EPIC-5, User-Activity-Audit-Log |


## Description

User Story:

As an Admin, I want a system-wide audit log of user actions (logins, user management, assignment, category management) so that I can investigate issues and ensure accountability.

Acceptance Criteria:

Given any instrumented action occurs anywhere in the system, then a corresponding Audit Log entry is created within the same request/transaction, never as a best-effort async afterthought that could silently fail.

Given an Admin filters the Audit Log by Actor and Date Range, then only matching entries are displayed, sorted newest-first by default.

Only the Admin role can view the Audit Log screen; the menu item and direct URL are both inaccessible to Marketing Executives.

Given the configured retention period elapses for a given record, then that record is eligible for archival per the retention policy, without affecting records still within the active retention window.


## Links

### Parent Issue

- **Key:** C1-95
- **Summary:** N/A



_Last updated: 2026-06-26 05:14:54_
