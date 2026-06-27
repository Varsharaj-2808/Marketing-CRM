---
jira-key: C1-5
source-type: Story
source-summary: [STORY-1.1.1] As any user, I want to log in securely so that I can access only the data permitted by my role....
status: To Do
updated: 2026-06-26 09:02:56
---

# Acceptance Criteria: C1-5

**Source:** C1-5 - [STORY-1.1.1] As any user, I want to log in securely so that I can access only the data permitted by my role....
**Issue Type:** Story

## Criteria

Given valid credentials and an Active account, when the user submits the login form, then they are authenticated and redirected to their role-based dashboard within 2 seconds.

Given invalid credentials, when the user submits the login form, then a generic 'Invalid email or password' error is shown without revealing which field was wrong.

Given an Inactive/disabled account, when correct credentials are submitted, then login is rejected with the message 'Account is inactive. Contact your administrator.'

Given 5 consecutive failed attempts, when the 6th attempt is made within 15 minutes, then the account is temporarily locked and the user is shown a lockout message with retry time.

Given a successful login, then a row is written to Audit Log with user ID, timestamp, IP address, and result = Success.

---
_Last updated: 2026-06-26 09:02:56_
