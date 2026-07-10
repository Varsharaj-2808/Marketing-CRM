---
jira-key: C1-14
issue-type: Story
status: To Do
updated: 2026-06-26 05:13:21
---

# C1-14: [STORY-1.2.1] As an Admin, I want to create and manage user accounts so that the right people have the right access....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | Unassigned |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:13:21 |
| Updated | 2026-06-26 05:13:21 |
| Labels | EPIC-1, User-&-Role-Management-(Admin-only) |


## Description

User Story:

As an Admin, I want to create and manage user accounts so that the right people have the right access.

Acceptance Criteria:

Given an Admin is on Add User, when all mandatory fields are valid and the email is unique, then the user is created with status Active and an auto-generated Employee ID, and a welcome email with temporary credentials is sent.

Given an Admin attempts to create a user with an email that already exists, then the system blocks save and shows 'Email already registered.'

Given an Admin deactivates a user, when that user attempts to log in, then login is rejected and all leads remain assigned to that user (ownership is not auto-transferred).

Given an Admin changes a user's role, then the change takes effect on the user's next login (existing session retains old permissions until re-login or token refresh).

Only Admin role can access any screen under User Management; Marketing Executive attempting direct URL access receives a 403 / redirect to their dashboard.


## Links

### Parent Issue

- **Key:** C1-4
- **Summary:** N/A



_Last updated: 2026-06-26 05:13:21_
