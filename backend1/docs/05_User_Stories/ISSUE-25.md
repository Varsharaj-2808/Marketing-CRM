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


## Links

### Parent Issue

- **Key:** C1-24
- **Summary:** N/A



_Last updated: 2026-06-26 05:13:33_
