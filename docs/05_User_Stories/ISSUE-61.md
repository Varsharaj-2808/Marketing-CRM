---
jira-key: C1-61
issue-type: Story
status: To Do
updated: 2026-06-26 05:14:11
---

# C1-61: [STORY-3.1.1] As an Admin, I want to maintain a master list of Lead Business Categories and Sub-Categories so that Marketing can segment and target leads precisely....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:14:11 |
| Updated | 2026-06-26 05:14:11 |
| Labels | Category-&-Sub-Category-Master-Management, EPIC-3 |


## Description

User Story:

As an Admin, I want to maintain a master list of Lead Business Categories and Sub-Categories so that Marketing can segment and target leads precisely.

Acceptance Criteria:

Given an Admin adds a new Sub-Category, when a parent Category is selected, then the Sub-Category is saved as a child of that Category only and immediately available on the Lead Entry form.

Given a Category or Sub-Category is referenced by one or more existing leads, when an Admin attempts to delete it, then deletion is blocked and only 'Deactivate' (hide from new entry, retain on historic leads) is permitted.

Given a Marketing Executive opens Lead Entry, when they select a Category, then the Sub-Category list refreshes to show only children of that Category, with no leftover options from a previously selected Category.

Only Admin role can create, edit, deactivate, or delete Categories/Sub-Categories; Marketing Executives have read-only (selection) access.


## Links

### Parent Issue

- **Key:** C1-60
- **Summary:** N/A



_Last updated: 2026-06-26 05:14:11_
