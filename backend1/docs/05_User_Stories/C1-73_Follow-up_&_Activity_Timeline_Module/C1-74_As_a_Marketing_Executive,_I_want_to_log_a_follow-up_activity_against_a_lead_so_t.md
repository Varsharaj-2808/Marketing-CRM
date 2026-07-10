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


## Acceptance Criteria

Given a Marketing Executive submits a Follow-up with Outcome = 'Decision Pending', when Next Follow-up Date is left blank, then save is blocked with 'Next Follow-up Date is required unless the outcome closes the lead.'

Given a Follow-up is saved, then it appears immediately at the top of the Lead's Follow-up Timeline (reverse chronological) along with the logged-in user's name and timestamp.

Given a Follow-up record has been saved, then the Author and Timestamp fields are permanently locked and cannot be edited by any user, including Admin (only addition of a correction note is allowed, never alteration of the original entry).

Given a Follow-up is logged with a Proposal Amount, then the Lead's 'Estimated/Proposal Value' on the Lead Detail header updates to reflect the latest proposal amount.


## Links

### Parent Epic

- **Key:** C1-73
- **Summary:** [EPIC-4] Follow-up & Activity Timeline Module
### Child Issues

- **C1-75:** [TASK-4.1.1-01] Design Follow-up Entry form (Date, Type, Notes, Outcome, Next Follow-up Date, Proposal Amount, Stage)- **C1-76:** [TASK-4.1.1-02] Build Follow-up database table linked to Lead (1 lead : many follow-ups)- **C1-77:** [TASK-4.1.1-03] Build POST /leads/{id}/followups API- **C1-78:** [TASK-4.1.1-04] Implement Follow-up Type dropdown (Call, WhatsApp, Email, Online Meeting, Client Meeting, Demo, Proposal Discussion)- **C1-79:** [TASK-4.1.1-05] Implement Outcome dropdown (Interested, Need More Info, Proposal Requested, Budget Discussion, Decision Pending, Not Interested)- **C1-80:** [TASK-4.1.1-06] Enforce mandatory Next Follow-up Date unless Outcome is a closing outcome (Not Interested / lead moved to Won/Lost)- **C1-81:** [TASK-4.1.1-07] Auto-timestamp and auto-tag the logged-in user as the follow-up author (non-editable)- **C1-82:** [TASK-4.1.1-08] Write Follow-up-Logged event to Lead History



_Last updated: 2026-06-26 05:14:25_
