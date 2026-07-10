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


## Acceptance Criteria

Given an Admin adds a new Sub-Category, when a parent Category is selected, then the Sub-Category is saved as a child of that Category only and immediately available on the Lead Entry form.

Given a Category or Sub-Category is referenced by one or more existing leads, when an Admin attempts to delete it, then deletion is blocked and only 'Deactivate' (hide from new entry, retain on historic leads) is permitted.

Given a Marketing Executive opens Lead Entry, when they select a Category, then the Sub-Category list refreshes to show only children of that Category, with no leftover options from a previously selected Category.

Only Admin role can create, edit, deactivate, or delete Categories/Sub-Categories; Marketing Executives have read-only (selection) access.


## Links

### Parent Epic

- **Key:** C1-60
- **Summary:** [EPIC-3] Lead Categorization (Business Type Taxonomy)
### Child Issues

- **C1-62:** [TASK-3.1.1-01] Build Category Master screen (CRUD for top-level categories)- **C1-63:** [TASK-3.1.1-02] Build Sub-Category Master screen (CRUD, each linked to one parent category)- **C1-64:** [TASK-3.1.1-03] Build cascading dropdown component (Category -> filtered Sub-Category) for reuse on Lead Entry/Edit- **C1-65:** [TASK-3.1.1-04] Seed initial taxonomy (see Category Taxonomy tab) as system defaults- **C1-66:** [TASK-3.1.1-05] Prevent deletion of a Category/Sub-Category that is in use; allow Deactivate instead- **C1-67:** [TASK-3.1.1-06] Write Category Master changes to Audit Log



_Last updated: 2026-06-26 05:14:11_
