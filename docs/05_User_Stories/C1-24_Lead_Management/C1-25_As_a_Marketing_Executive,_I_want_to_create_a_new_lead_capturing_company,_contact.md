---
jira-key: C1-25
issue-type: Story
status: To Do
updated: 2026-06-26 05:13:33
---

# C1-25: [STORY-2.1.1] As a Marketing Executive, I want to create a new lead capturing company, contact, source, and business category so that potential customers are tracke...

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:13:33 |
| Updated | 2026-06-26 05:13:33 |
| Labels | EPIC-2, Lead-Creation |


## Description

User Story:

As a Marketing Executive, I want to create a new lead capturing company, contact, source, and business category so that potential customers are tracked and segmented from day one.

Acceptance Criteria:

Given a Marketing Executive completes all mandatory fields (Company Name, Contact Person, Mobile Number, Lead Source, Business Category, Service Interested), when they click Save, then a new Lead is created with status 'New Lead', a unique Lead ID, and the creator as Assigned To.

Given the Mobile Number entered matches an existing open lead, when the user clicks Save, then a non-blocking warning 'A lead with this mobile number already exists (LD-xxxx) — Continue / View Existing' is shown before allowing save.

Given any mandatory field is empty or invalid (e.g., malformed email, non-numeric mobile), when Save is clicked, then inline field errors are shown and the record is not persisted.

Given a lead is successfully created, then an entry is automatically added to the Lead History timeline: 'Lead Created by <user> on <timestamp>.'

Given Business Category is selected, then the Sub-Category dropdown is filtered to only show sub-categories belonging to that category (see Category Taxonomy tab).


## Acceptance Criteria

Given a Marketing Executive completes all mandatory fields (Company Name, Contact Person, Mobile Number, Lead Source, Business Category, Service Interested), when they click Save, then a new Lead is created with status 'New Lead', a unique Lead ID, and the creator as Assigned To.

Given the Mobile Number entered matches an existing open lead, when the user clicks Save, then a non-blocking warning 'A lead with this mobile number already exists (LD-xxxx) — Continue / View Existing' is shown before allowing save.

Given any mandatory field is empty or invalid (e.g., malformed email, non-numeric mobile), when Save is clicked, then inline field errors are shown and the record is not persisted.

Given a lead is successfully created, then an entry is automatically added to the Lead History timeline: 'Lead Created by <user> on <timestamp>.'

Given Business Category is selected, then the Sub-Category dropdown is filtered to only show sub-categories belonging to that category (see Category Taxonomy tab).


## Links

### Parent Epic

- **Key:** C1-24
- **Summary:** [EPIC-2] Lead Management
### Child Issues

- **C1-26:** [TASK-2.1.1-01] Design Lead Entry form (Company Info, Contact Info, Lead Info sections)- **C1-27:** [TASK-2.1.1-02] Build Lead database schema (see Data Model tab)- **C1-28:** [TASK-2.1.1-03] Build POST /leads API with field-level validation- **C1-29:** [TASK-2.1.1-04] Auto-generate unique Lead ID (e.g., LD-2026-00001)- **C1-30:** [TASK-2.1.1-05] Implement Lead Source dropdown (configurable list)- **C1-31:** [TASK-2.1.1-06] Implement Business Category + Sub-Category cascading dropdowns- **C1-32:** [TASK-2.1.1-07] Implement Service Interested multi-select- **C1-33:** [TASK-2.1.1-08] Implement Priority (Hot/Warm/Cold) selector- **C1-34:** [TASK-2.1.1-09] Implement duplicate-lead check on Mobile Number / Email- **C1-35:** [TASK-2.1.1-10] Default new lead Status = 'New Lead' and Stage = 'New Lead'- **C1-36:** [TASK-2.1.1-11] Auto-set Assigned To = creating user (Marketing Executive) unless reassigned by Admin- **C1-37:** [TASK-2.1.1-12] Write Lead-Created event to Lead History/Audit log



_Last updated: 2026-06-26 05:13:33_
