---
jira-key: C1-5
issue-type: Story
status: To Do
updated: 2026-06-26 09:02:56
---

# C1-5: [STORY-1.1.1] As any user, I want to log in securely so that I can access only the data permitted by my role....

**Issue Type:** Story

## Metadata

| Field | Value |
|-------|-------|
| Status | To Do |
| Priority | High |
| Assignee | varsharaj |
| Reporter | Sulabh Varshney |
| Created | 2026-06-26 05:13:11 |
| Updated | 2026-06-26 09:02:56 |
| Labels | EPIC-1, User-Login |


## Description

User Story:

As any user, I want to log in securely so that I can access only the data permitted by my role.

Acceptance Criteria:

Given valid credentials and an Active account, when the user submits the login form, then they are authenticated and redirected to their role-based dashboard within 2 seconds.

Given invalid credentials, when the user submits the login form, then a generic 'Invalid email or password' error is shown without revealing which field was wrong.

Given an Inactive/disabled account, when correct credentials are submitted, then login is rejected with the message 'Account is inactive. Contact your administrator.'

Given 5 consecutive failed attempts, when the 6th attempt is made within 15 minutes, then the account is temporarily locked and the user is shown a lockout message with retry time.

Given a successful login, then a row is written to Audit Log with user ID, timestamp, IP address, and result = Success.


## Links

### Parent Issue

- **Key:** C1-4
- **Summary:** N/A



_Last updated: 2026-06-26 09:02:56_
