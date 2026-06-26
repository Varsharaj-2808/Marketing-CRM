## Table of Contents
1. [FEAT-1.1: User Login](#1-feat-11-user-login)
   - [STORY-1.1.1 — Positive Login Scenarios](#11-story-111-positive-login-scenarios)
   - [STORY-1.1.1 — Negative Login Scenarios](#12-story-111-negative-login-scenarios)
   - [STORY-1.1.1 — Security & Edge Cases](#13-story-111-security--edge-cases)
   - [STORY-1.1.1 — Session & Token Management](#14-story-111-session--token-management)
   - [STORY-1.1.1 — Audit Log Verification](#15-story-111-audit-log-verification)
   - [STORY-1.1.1 — Remember Me Feature](#16-story-111-remember-me-feature)


## 1. FEAT-1.1: User Login

### 1.1 STORY-1.1.1 — Positive Login Scenarios

* **TEST-EP1-LOGIN-001 (Positive)**:
  * *Description:* Valid credentials with Active Admin account
  * *Input:* `email = "admin@company.com"`, `password = "SecurePass123!"`, account status = "Active", role = "Admin"
  * *Expected Output:* HTTP 200 OK. JWT access token returned. User redirected to Admin Dashboard within 2 seconds. Response contains `role = "Admin"`, `employee_id = "EMP-00001"`.
  * *Traceability:* STORY-1.1.1 AC-1

* **TEST-EP1-LOGIN-002 (Positive)**:
  * *Description:* Valid credentials with Active Marketing Executive account
  * *Input:* `email = "marketing@company.com"`, `password = "MktPass456!"`, account status = "Active", role = "Marketing Executive"
  * *Expected Output:* HTTP 200 OK. JWT access token returned. User redirected to Marketing Dashboard within 2 seconds. Response contains `role = "Marketing Executive"`, `employee_id = "EMP-00002"`.
  * *Traceability:* STORY-1.1.1 AC-1

* **TEST-EP1-LOGIN-003 (Positive)**:
  * *Description:* Email normalization — mixed case email should match
  * *Input:* `email = "AdMiN@CoMpAnY.CoM"`, `password = "SecurePass123!"`, account exists as `admin@company.com`
  * *Expected Output:* HTTP 200 OK. Case-insensitive email matching succeeds. JWT returned. Login successful.
  * *Traceability:* STORY-1.1.1 AC-1 (Edge case)

* **TEST-EP1-LOGIN-004 (Positive)**:
  * *Description:* Login with leading/trailing whitespace in email
  * *Input:* `email = "  admin@company.com  "`, `password = "SecurePass123!"`
  * *Expected Output:* HTTP 200 OK. Email trimmed before validation. Login successful.
  * *Traceability:* STORY-1.1.1 AC-1 (Edge case)

* **TEST-EP1-LOGIN-005 (Positive)**:
  * *Description:* Login with password at bcrypt maximum length (72 characters)
  * *Input:* `email = "admin@company.com"`, `password = "A" + "1!" * 35` (72 chars total)
  * *Expected Output:* HTTP 200 OK. Password hashed and matched successfully. Login succeeds.
  * *Traceability:* STORY-1.1.1 BR-1 (bcrypt boundary)

* **TEST-EP1-LOGIN-006 (Positive)**:
  * *Description:* Login response time verification — must complete within 2 seconds
  * *Input:* Valid credentials for any Active user
  * *Expected Output:* HTTP 200 OK. Total response time (request to redirect) ≤ 2000ms. Token generation + password hash comparison + role lookup completes within threshold.
  * *Traceability:* STORY-1.1.1 AC-1 (Performance)

---

### 1.2 STORY-1.1.1 — Negative Login Scenarios

* **TEST-EP1-LOGIN-007 (Negative)**:
  * *Description:* Invalid credentials — wrong password
  * *Input:* `email = "admin@company.com"`, `password = "WrongPass123!"`
  * *Expected Output:* HTTP 401 Unauthorized. Generic error message: "Invalid email or password". No indication of which field was incorrect. Failed attempt counter incremented by 1.
  * *Traceability:* STORY-1.1.1 AC-2

* **TEST-EP1-LOGIN-008 (Negative)**:
  * *Description:* Invalid credentials — non-existent email
  * *Input:* `email = "unknown@company.com"`, `password = "AnyPass123!"`
  * *Expected Output:* HTTP 401 Unauthorized. Generic error message: "Invalid email or password". No indication that email does not exist. Failed attempt counter NOT incremented (or incremented for non-existent email to prevent enumeration).
  * *Traceability:* STORY-1.1.1 AC-2

* **TEST-EP1-LOGIN-009 (Negative)**:
  * *Description:* Inactive account — correct credentials but account status = "Inactive"
  * *Input:* `email = "inactive@company.com"`, `password = "CorrectPass123!"`, account status = "Inactive"
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Account is inactive. Contact your administrator." Login rejected regardless of correct password. Failed attempt counter NOT incremented.
  * *Traceability:* STORY-1.1.1 AC-3

* **TEST-EP1-LOGIN-010 (Negative)**:
  * *Description:* Empty email field
  * *Input:* `email = ""`, `password = "SecurePass123!"`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Email is required". Form validation triggers before authentication attempt. Failed attempt counter NOT incremented.
  * *Traceability:* STORY-1.1.1 AC-2 (Input validation)

* **TEST-EP1-LOGIN-011 (Negative)**:
  * *Description:* Empty password field
  * *Input:* `email = "admin@company.com"`, `password = ""`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Password is required". Form validation triggers before authentication attempt. Failed attempt counter NOT incremented.
  * *Traceability:* STORY-1.1.1 AC-2 (Input validation)

* **TEST-EP1-LOGIN-012 (Negative)**:
  * *Description:* Invalid email format
  * *Input:* `email = "not-an-email"`, `password = "SecurePass123!"`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Invalid email format". Form validation triggers before authentication attempt. Failed attempt counter NOT incremented.
  * *Traceability:* STORY-1.1.1 AC-2 (Input validation)

* **TEST-EP1-LOGIN-013 (Negative)**:
  * *Description:* Password too short (less than minimum policy length)
  * *Input:* `email = "admin@company.com"`, `password = "123"`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Password must be at least 8 characters long". Form validation triggers before authentication attempt.
  * *Traceability:* STORY-1.1.1 (Input validation)

* **TEST-EP1-LOGIN-014 (Negative)**:
  * *Description:* Account lockout — 5 consecutive failed attempts within 15 minutes
  * *Input:* `email = "marketing@company.com"`, 5 consecutive wrong passwords submitted within 15-minute window
  * *Expected Output:* Attempts 1-4: HTTP 401 with "Invalid email or password". Attempt 5: HTTP 429 Too Many Requests. Error message: "Account temporarily locked. Please try again after [timestamp + 15 min]." Account lockout flag set in database. Lockout timestamp recorded.
  * *Traceability:* STORY-1.1.1 AC-4

* **TEST-EP1-LOGIN-015 (Negative)**:
  * *Description:* 6th attempt during active lockout period
  * *Input:* `email = "marketing@company.com"`, correct password submitted while account is locked (within 15 minutes of 5th failed attempt)
  * *Expected Output:* HTTP 429 Too Many Requests. Error message: "Account temporarily locked. Please try again after [remaining time]." Even with correct password, login is blocked. Lockout timer continues.
  * *Traceability:* STORY-1.1.1 AC-4

* **TEST-EP1-LOGIN-016 (Positive)**:
  * *Description:* Login after lockout period expires
  * *Input:* `email = "marketing@company.com"`, correct password submitted after 15-minute lockout period has passed
  * *Expected Output:* HTTP 200 OK. Login successful. Failed attempt counter reset to 0. Lockout flag cleared. JWT token returned.
  * *Traceability:* STORY-1.1.1 AC-4

* **TEST-EP1-LOGIN-017 (Negative)**:
  * *Description:* SQL injection attempt in email field
  * *Input:* `email = "' OR '1'='1"`, `password = "any"`
  * *Expected Output:* HTTP 401 Unauthorized. No SQL injection occurs. Query safely parameterized. Generic error message displayed. No database error exposed.
  * *Traceability:* STORY-1.1.1 (Security)

* **TEST-EP1-LOGIN-018 (Negative)**:
  * *Description:* XSS attempt in email field
  * *Input:* `email = "<script>alert('xss')</script>@test.com"`, `password = "any"`
  * *Expected Output:* HTTP 400 Bad Request. Input sanitized/validated. No script execution. Error message displayed without rendering HTML.
  * *Traceability:* STORY-1.1.1 (Security)

* **TEST-EP1-LOGIN-019 (Negative)**:
  * *Description:* NoSQL injection attempt in email (if applicable)
  * *Input:* `email = "{"$gt": ""}"`, `password = "any"`
  * *Expected Output:* HTTP 400 Bad Request. Input treated as literal string. No injection occurs.
  * *Traceability:* STORY-1.1.1 (Security)

---

### 1.3 STORY-1.1.1 — Security & Edge Cases

* **TEST-EP1-LOGIN-020 (Security)**:
  * *Description:* Brute force protection — automated script attempts 1000 logins
  * *Input:* Automated script sends 1000 login requests with random passwords for same email within 15 minutes
  * *Expected Output:* After 5th failed attempt, all subsequent requests return HTTP 429. Account locked for 15 minutes. No further authentication attempts processed. Rate limiting enforced at IP level if configured.
  * *Traceability:* STORY-1.1.1 AC-4, BR-3

* **TEST-EP1-LOGIN-021 (Security)**:
  * *Description:* Password never transmitted or logged in plaintext
  * *Input:* Submit login with `password = "MySecret123!"` and inspect network traffic, server logs, and database
  * *Expected Output:* Password transmitted over HTTPS only. Server logs contain only "Login attempt for [email]" without password. Database stores only bcrypt hash. Audit log contains no password reference.
  * *Traceability:* STORY-1.1.1 BR-1

* **TEST-EP1-LOGIN-022 (Security)**:
  * *Description:* Verify bcrypt hashing parameters (salt rounds, algorithm)
  * *Input:* Inspect stored password hash in `users` table for any user
  * *Expected Output:* Password stored as bcrypt hash (format: `$2b$10$...` or `$2a$12$...`). Salt rounds ≥ 10. Hash length consistent with bcrypt standard. No plaintext or weak hashing (MD5/SHA1) detected.
  * *Traceability:* STORY-1.1.1 BR-1

* **TEST-EP1-LOGIN-023 (Security)**:
  * *Description:* Timing attack resistance — response time for valid vs invalid email should be similar
  * *Input:* Measure response time for: (a) valid email + wrong password, (b) invalid email + any password
  * *Expected Output:* Response times differ by < 50ms (within noise threshold). System uses constant-time comparison or identical code paths to prevent email enumeration via timing.
  * *Traceability:* STORY-1.1.1 AC-2 (Security)

* **TEST-EP1-LOGIN-024 (Security)**:
  * *Description:* Account enumeration prevention — same error for non-existent vs wrong password
  * *Input:* Attempt login with (a) non-existent email, (b) existing email with wrong password
  * *Expected Output:* Both return HTTP 401 with identical message: "Invalid email or password". No difference in response structure, headers, or timing that reveals email existence.
  * *Traceability:* STORY-1.1.1 AC-2

* **TEST-EP1-LOGIN-025 (Edge Case)**:
  * *Description:* Login with email containing Unicode/international characters
  * *Input:* `email = "user@例え.jp"`, valid password for that account
  * *Expected Output:* HTTP 200 OK. Unicode email handled correctly (IDN/Punycode conversion if applicable). Login successful.
  * *Traceability:* STORY-1.1.1 (Edge case)

* **TEST-EP1-LOGIN-026 (Edge Case)**:
  * *Description:* Login with maximum length email (254 characters per RFC 5321)
  * *Input:* `email = "a" * 243 + "@company.com"` (254 chars total), valid password
  * *Expected Output:* HTTP 200 OK. Email accepted and validated. Login successful. Database VARCHAR(255) accommodates the value.
  * *Traceability:* STORY-1.1.1 (Boundary)

* **TEST-EP1-LOGIN-027 (Edge Case)**:
  * *Description:* Login with email exceeding maximum length (255+ characters)
  * *Input:* `email = "a" * 250 + "@company.com"`, valid password
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Email exceeds maximum length of 255 characters". Login rejected before database query.
  * *Traceability:* STORY-1.1.1 (Boundary)

* **TEST-EP1-LOGIN-028 (Edge Case)**:
  * *Description:* Simultaneous login from multiple browsers/devices
  * *Input:* User logs in from Chrome and Firefox simultaneously with valid credentials
  * *Expected Output:* Both logins succeed. Two separate JWT sessions created. Each session has independent token. No session invalidation on new login (unless single-session policy enforced).
  * *Traceability:* STORY-1.1.1 (Edge case)

* **TEST-EP1-LOGIN-029 (Edge Case)**:
  * *Description:* Login immediately after password change
  * *Input:* User changes password, then immediately attempts login with NEW password
  * *Expected Output:* HTTP 200 OK. Login successful with new password. Old password no longer works.
  * *Traceability:* STORY-1.1.1 (Edge case)

* **TEST-EP1-LOGIN-030 (Edge Case)**:
  * *Description:* Login with old password after password change
  * *Input:* User changes password, then attempts login with OLD password
  * *Expected Output:* HTTP 401 Unauthorized. "Invalid email or password". Old password hash no longer matches.
  * *Traceability:* STORY-1.1.1 (Edge case)

---

### 1.4 STORY-1.1.1 — Session & Token Management

* **TEST-EP1-LOGIN-031 (Positive)**:
  * *Description:* JWT access token structure and claims verification
  * *Input:* Successful login for any Active user
  * *Expected Output:* JWT contains: `sub` (user_id/employee_id), `role` (Admin/Marketing Executive), `iat` (issued at), `exp` (expires in 8 hours = 28800 seconds), `jti` (unique token ID). Token signed with secure secret (HS256/RS256).
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-032 (Positive)**:
  * *Description:* Access token expiration — 8 hours of inactivity
  * *Input:* User logs in, receives JWT. No activity for 8 hours. Attempts to access protected route.
  * *Expected Output:* After 8 hours, HTTP 401 Unauthorized. Error message: "Token expired. Please log in again." Token invalidated by expiry check.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-033 (Positive)**:
  * *Description:* Access token still valid before 8-hour expiry
  * *Input:* User logs in, waits 7 hours 59 minutes, accesses protected route
  * *Expected Output:* HTTP 200 OK. Request succeeds. Token valid until exact expiry timestamp.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-034 (Negative)**:
  * *Description:* Access protected route with expired JWT token
  * *Input:* Send request to `/api/leads` with JWT that has `exp` timestamp in the past
  * *Expected Output:* HTTP 401 Unauthorized. Error message: "Token expired. Please log in again." Request rejected at middleware level.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-035 (Negative)**:
  * *Description:* Access protected route with malformed/invalid JWT token
  * *Input:* Send request with `Authorization: Bearer invalid.token.here`
  * *Expected Output:* HTTP 401 Unauthorized. Error message: "Invalid token." Token signature verification fails.
  * *Traceability:* STORY-1.1.1 (Security)

* **TEST-EP1-LOGIN-036 (Negative)**:
  * *Description:* Access protected route without Authorization header
  * *Input:* Send request to `/api/leads` with no `Authorization` header
  * *Expected Output:* HTTP 401 Unauthorized. Error message: "Authentication required." Request rejected before reaching route handler.
  * *Traceability:* STORY-1.1.1 (Security)

* **TEST-EP1-LOGIN-037 (Negative)**:
  * *Description:* Access protected route with tampered JWT payload
  * *Input:* Modify JWT payload (e.g., change role from "Marketing Executive" to "Admin") and re-sign with invalid secret
  * *Expected Output:* HTTP 401 Unauthorized. Signature verification fails. Tampered token rejected.
  * *Traceability:* STORY-1.1.1 (Security)

* **TEST-EP1-LOGIN-038 (Negative)**:
  * *Description:* Access protected route with JWT from deactivated user
  * *Input:* User was deactivated while holding a valid JWT. Token attempts to access `/api/leads`.
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Account is inactive." System checks user status on every request, not just token validity.
  * *Traceability:* STORY-1.2.1 AC-3

* **TEST-EP1-LOGIN-039 (Positive)**:
  * *Description:* Refresh token mechanism (if implemented)
  * *Input:* Access token expired but refresh token valid. Send refresh request with valid refresh token.
  * *Expected Output:* HTTP 200 OK. New access token issued. New expiry set to 8 hours from now. Refresh token remains valid (or rotated if policy requires).
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-040 (Negative)**:
  * *Description:* Refresh token expiry — Remember Me 30 days
  * *Input:* Remember Me enabled. Refresh token issued. No activity for 30 days + 1 second.
  * *Expected Output:* Refresh token expired. HTTP 401 Unauthorized. User must log in again with credentials. No silent re-authentication possible.
  * *Traceability:* STORY-1.1.1 BR-2

---

### 1.5 STORY-1.1.1 — Audit Log Verification

* **TEST-EP1-LOGIN-041 (Positive)**:
  * *Description:* Successful login writes to Audit Log
  * *Input:* User "admin@company.com" logs in successfully from IP 192.168.1.100
  * *Expected Output:* New row inserted into `audit_log` table with: `user_id` = "EMP-00001", `action` = "LOGIN", `timestamp` = current UTC timestamp, `ip_address` = "192.168.1.100", `result` = "Success", `details` = NULL or minimal metadata (NO password). Row committed within transaction.
  * *Traceability:* STORY-1.1.1 AC-5, BR-1

* **TEST-EP1-LOGIN-042 (Positive)**:
  * *Description:* Failed login writes to Audit Log
  * *Input:* User submits wrong password for "admin@company.com" from IP 192.168.1.101
  * *Expected Output:* New row in `audit_log` with: `user_id` = "EMP-00001" (if email exists) or NULL, `action` = "LOGIN_FAILED", `timestamp` = current UTC, `ip_address` = "192.168.1.101", `result` = "Failed", `details` = "Invalid credentials" (NO password). Failed attempt count updated.
  * *Traceability:* STORY-1.1.1 AC-5, BR-1

* **TEST-EP1-LOGIN-043 (Positive)**:
  * *Description:* Account lockout event writes to Audit Log
  * *Input:* 5th consecutive failed login triggers lockout for "marketing@company.com"
  * *Expected Output:* `audit_log` row with: `action` = "ACCOUNT_LOCKED", `result` = "Locked", `details` = "5 failed attempts. Locked until [timestamp+15min]". Lockout timestamp recorded.
  * *Traceability:* STORY-1.1.1 AC-4, AC-5

* **TEST-EP1-LOGIN-044 (Positive)**:
  * *Description:* Account unlock event writes to Audit Log
  * *Input:* Lockout period expires, user successfully logs in
  * *Expected Output:* `audit_log` row with: `action` = "ACCOUNT_UNLOCKED", `result` = "Success", `details` = "Lockout period expired. Account reactivated." Failed attempt counter reset to 0.
  * *Traceability:* STORY-1.1.1 AC-4, AC-5

* **TEST-EP1-LOGIN-045 (Security)**:
  * *Description:* Verify no password in Audit Log entries
  * *Input:* Inspect all `audit_log` rows for LOGIN and LOGIN_FAILED actions
  * *Expected Output:* No row contains password, password hash, or any credential data. Only user_id, action, timestamp, IP, result, and generic details present.
  * *Traceability:* STORY-1.1.1 BR-1

* **TEST-EP1-LOGIN-046 (Security)**:
  * *Description:* Verify IP address capture in Audit Log
  * *Input:* User logs in from different IP addresses
  * *Expected Output:* Each `audit_log` row contains accurate `ip_address` (IPv4 or IPv6). X-Forwarded-For header respected if behind proxy. Local IP (127.0.0.1) captured for local testing.
  * *Traceability:* STORY-1.1.1 AC-5

* **TEST-EP1-LOGIN-047 (Positive)**:
  * *Description:* Audit Log timestamp accuracy — UTC timezone
  * *Input:* User logs in at local time 2026-06-26 14:30:00 IST
  * *Expected Output:* `audit_log` timestamp stored as `2026-06-26 09:00:00+00` (UTC). TIMESTAMP WITH TIME ZONE type used. No timezone ambiguity.
  * *Traceability:* STORY-1.1.1 AC-5

* **TEST-EP1-LOGIN-048 (Positive)**:
  * *Description:* Audit Log immutable — cannot be modified or deleted
  * *Input:* Attempt UPDATE or DELETE on `audit_log` table via SQL injection or direct DB access
  * *Expected Output:* If row-level security / trigger exists: Operation blocked. If no protection: Audit Log table should be append-only by design. Application layer prevents modification.
  * *Traceability:* STORY-1.1.1 AC-5 (Data integrity)

---

### 1.6 STORY-1.1.1 — Remember Me Feature

* **TEST-EP1-LOGIN-049 (Positive)**:
  * *Description:* Remember Me checkbox checked — extended refresh token
  * *Input:* Login with `remember_me = true`, valid credentials
  * *Expected Output:* HTTP 200 OK. Access token expires in 8 hours. Refresh token expires in 30 days (2592000 seconds). Cookie with `Max-Age=2592000` set if cookie-based. Remember Me flag stored in session record.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-050 (Positive)**:
  * *Description:* Remember Me checkbox unchecked — standard token expiry
  * *Input:* Login with `remember_me = false`, valid credentials
  * *Expected Output:* HTTP 200 OK. Access token expires in 8 hours. Refresh token expires in 8 hours (same as access token, or session-only). No persistent cookie. Session ends on browser close.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-051 (Positive)**:
  * *Description:* Remember Me session persists after browser restart
  * *Input:* Login with `remember_me = true`. Close browser. Reopen browser after 1 day.
  * *Expected Output:* User remains authenticated (via refresh token / persistent cookie). No re-login required. Dashboard loads automatically. Session valid until 30-day expiry.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-052 (Negative)**:
  * *Description:* Remember Me session expires after 30 days
  * *Input:* Login with `remember_me = true`. Wait 30 days + 1 second. Access protected route.
  * *Expected Output:* HTTP 401 Unauthorized. Refresh token expired. User redirected to login page. No automatic re-authentication.
  * *Traceability:* STORY-1.1.1 BR-2

* **TEST-EP1-LOGIN-053 (Edge Case)**:
  * *Description:* Remember Me with account deactivation during session
  * *Input:* User logs in with Remember Me. Admin deactivates account. User returns after 1 day.
  * *Expected Output:* HTTP 403 Forbidden. "Account is inactive." Session invalidated upon status check. Remember Me token rejected.
  * *Traceability:* STORY-1.1.1 BR-2, STORY-1.2.1 AC-3

---
 ## Summary

| Module | Total Test Cases |
|---|---|
| FEAT-1.1: User Login — Positive Scenarios | 6 |
| FEAT-1.1: User Login — Negative Scenarios | 13 |
| FEAT-1.1: User Login — Security & Edge Cases | 9 |
| FEAT-1.1: User Login — Session & Token Management | 10 |
| FEAT-1.1: User Login — Audit Log Verification | 8 |
| FEAT-1.1: User Login — Remember Me Feature | 5 |
