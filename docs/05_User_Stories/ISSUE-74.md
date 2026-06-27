---
jira-key: C1-74
issue-type: Story
status: To Do
updated: 2026-06-26 05:14:25
---

# C1-74: [STORY-4.1.1] As a Marketing Executive, I want to log a follow-up activity against a lead so that every interaction with the customer is documented....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:14:25 |
| Updated | 2026-06-26 05:14:25 |
| Labels | EPIC-4, Follow-up-Entry-&-Scheduling |


## Description

User Story:

As a Marketing Executive, I want to log a follow-up activity against a lead so that every interaction with the customer is documented.

Acceptance Criteria:

Given a Marketing Executive submits a Follow-up with Outcome = 'Decision Pending', when Next Follow-up Date is left blank, then save is blocked with 'Next Follow-up Date is required unless the outcome closes the lead.'

Given a Follow-up is saved, then it appears immediately at the top of the Lead's Follow-up Timeline (reverse chronological) along with the logged-in user's name and timestamp.

Given a Follow-up record has been saved, then the Author and Timestamp fields are permanently locked and cannot be edited by any user, including Admin (only addition of a correction note is allowed, never alteration of the original entry).

Given a Follow-up is logged with a Proposal Amount, then the Lead's 'Estimated/Proposal Value' on the Lead Detail header updates to reflect the latest proposal amount.


## Links

### Parent Issue

- **Key:** C1-73
- **Summary:** N/A



_Last updated: 2026-06-26 05:14:25_
