---
jira-key: C1-88
issue-type: Story
status: To Do
updated: 2026-06-26 05:14:40
---

# C1-88: [STORY-4.3.1] As any user with lead access, I want to see a single chronological timeline combining creation, assignment, stage changes, and follow-ups so that I un...

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:14:40 |
| Updated | 2026-06-26 05:14:40 |
| Labels | EPIC-4, Unified-Lead-Activity-Timeline |


## Description

User Story:

As any user with lead access, I want to see a single chronological timeline combining creation, assignment, stage changes, and follow-ups so that I understand the full lead story at a glance.

Acceptance Criteria:

Given a Lead Detail page is opened, then the Timeline displays every Lead Created, Assignment, Stage Change, and Follow-up event for that lead in descending chronological order with date, actor, and a one-line description.

Given a user applies the 'Follow-ups' filter chip, then the timeline shows only follow-up events while preserving chronological order; switching to 'All' restores the full feed.

Given any historical timeline entry, then no UI control exists anywhere in the application to edit or delete it — the timeline is append-only by design, for every role including Admin.

Given a lead has more than 20 timeline events, then the page initially loads the most recent 20 with a 'Load more' control rather than loading the full history at once.


## Links

### Parent Issue

- **Key:** C1-73
- **Summary:** N/A



_Last updated: 2026-06-26 05:14:40_
