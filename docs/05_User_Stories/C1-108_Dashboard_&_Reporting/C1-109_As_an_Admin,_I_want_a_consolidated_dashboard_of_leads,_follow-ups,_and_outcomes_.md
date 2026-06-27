---
jira-key: C1-109
issue-type: Story
status: To Do
updated: 2026-06-26 05:15:02
---

# C1-109: [STORY-6.1.1] As an Admin, I want a consolidated dashboard of leads, follow-ups, and outcomes across the whole team so that I can monitor business performance witho...

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:15:02 |
| Updated | 2026-06-26 05:15:02 |
| Labels | Admin-Dashboard, EPIC-6 |


## Description

User Story:

As an Admin, I want a consolidated dashboard of leads, follow-ups, and outcomes across the whole team so that I can monitor business performance without daily status calls.

Acceptance Criteria:

Given the Admin Dashboard loads, then each card's count matches a live query result and updates within 5 seconds of any underlying data change (no manual refresh required beyond a page reload).

Given the Admin changes the date-range selector, then all cards and charts on the dashboard recalculate to reflect only data within the selected range.

Given the dataset contains up to 50,000 leads, then the Admin Dashboard fully loads in under 2 seconds on a standard broadband connection.


## Acceptance Criteria

Given the Admin Dashboard loads, then each card's count matches a live query result and updates within 5 seconds of any underlying data change (no manual refresh required beyond a page reload).

Given the Admin changes the date-range selector, then all cards and charts on the dashboard recalculate to reflect only data within the selected range.

Given the dataset contains up to 50,000 leads, then the Admin Dashboard fully loads in under 2 seconds on a standard broadband connection.


## Links

### Parent Epic

- **Key:** C1-108
- **Summary:** [EPIC-6] Dashboard & Reporting
### Child Issues

- **C1-110:** [TASK-6.1.1-01] Build Admin Dashboard layout (cards + charts)- **C1-111:** [TASK-6.1.1-02] Implement cards: Total Leads, New Leads, Today's Follow-ups, Proposal Sent, Won Leads, Lost Leads- **C1-112:** [TASK-6.1.1-03] Implement Lead Volume by Category chart- **C1-113:** [TASK-6.1.1-04] Implement Won-rate by Source chart- **C1-114:** [TASK-6.1.1-05] Implement 'At Risk' (overdue follow-up) widget- **C1-115:** [TASK-6.1.1-06] Implement date-range selector applying to all dashboard widgets- **C1-116:** [TASK-6.1.1-07] Cache/optimize dashboard queries for sub-2-second load with up to 50,000 leads



_Last updated: 2026-06-26 05:15:02_
