---
jira-key: C1-38
issue-type: Story
status: To Do
updated: 2026-06-26 05:13:47
---

# C1-38: [STORY-2.2.1] As a Marketing Executive, I want to view and search my leads so that I can prioritize and manage follow-ups efficiently....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:13:47 |
| Updated | 2026-06-26 05:13:47 |
| Labels | EPIC-2, Lead-Listing-&-Search |


## Description

User Story:

As a Marketing Executive, I want to view and search my leads so that I can prioritize and manage follow-ups efficiently.

Acceptance Criteria:

Given a Marketing Executive opens Lead List, then only leads where Assigned To = themselves are visible; an Admin sees all leads regardless of owner.

Given the user types into the search box, when at least 2 characters are entered, then the list filters in real time by Lead ID, Company Name, Contact Person, or Mobile Number.

Given multiple filters are applied (e.g., Status = 'Proposal Sent' AND Priority = 'Hot'), then results satisfy all filters simultaneously (AND logic).

Given more than 25 leads match, then results are paginated at 25 per page with page controls, and the total match count is displayed.

Given a Marketing Executive attempts to access a lead ID via direct URL that is not assigned to them, then the system returns 'Access denied' and the Admin is not affected by this restriction.


## Links

### Parent Issue

- **Key:** C1-24
- **Summary:** N/A



_Last updated: 2026-06-26 05:13:47_
