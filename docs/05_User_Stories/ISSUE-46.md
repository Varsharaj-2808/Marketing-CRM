---
jira-key: C1-46
issue-type: Story
status: To Do
updated: 2026-06-26 05:13:55
---

# C1-46: [STORY-2.3.1] As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:13:55 |
| Updated | 2026-06-26 05:13:55 |
| Labels | EPIC-2, Lead-Assignment-&-Reassignment |


## Description

User Story:

As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear.

Acceptance Criteria:

Given an Admin selects a new owner and confirms, when the lead currently has an owner, then the system requires a Reassignment Reason before saving.

Given a reassignment is saved, then the new owner receives a notification and the lead immediately disappears from the previous owner's 'My Leads' list and appears in the new owner's list.

Given a reassignment occurs, then Lead History records: previous owner, new owner, reason, actor (Admin), and timestamp — this entry is immutable.

Marketing Executives cannot access the Assign/Reassign action; the control is hidden (not just disabled) for that role.


## Links

### Parent Issue

- **Key:** C1-24
- **Summary:** N/A



_Last updated: 2026-06-26 05:13:55_
