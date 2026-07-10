2. [FEAT-1.2: User & Role Management (Admin Only)](#2-feat-12-user--role-management-admin-only)
   - [STORY-1.2.1 — Create User (Positive)](#21-story-121-create-user-positive)
   - [STORY-1.2.1 — Create User (Negative)](#22-story-121-create-user-negative)
   - [STORY-1.2.1 — Edit User](#23-story-121-edit-user)
   - [STORY-1.2.1 — Deactivate User](#24-story-121-deactivate-user)
   - [STORY-1.2.1 — Role Change & Permission](#25-story-121-role-change--permission)
   - [STORY-1.2.1 — Access Control & Authorization](#26-story-121-access-control--authorization)
   - [STORY-1.2.1 — Audit Log for User Management](#27-story-121-audit-log-for-user-management)
   - [STORY-1.2.1 — Business Rules Validation](#28-story-121-business-rules-validation)
3. [Cross-Cutting Security Test Cases](#3-cross-cutting-security-test-cases)


## 2. FEAT-1.2: User & Role Management (Admin Only)

### 2.1 STORY-1.2.1 — Create User (Positive)

* **TEST-EP1-USER-001 (Positive)**:
  * *Description:* Admin creates Marketing Executive user with all valid fields
  * *Input:* Admin authenticated. `employee_name = "John Doe"`, `mobile = "9876543210"`, `email = "john@company.com"`, `role = "Marketing Executive"`, `status = "Active"`
  * *Expected Output:* HTTP 201 Created. User row created in `users` table with: `employee_id` = "EMP-00003" (next sequential), `employee_name` = "John Doe", `mobile` = "9876543210", `email` = "john@company.com", `password` = bcrypt hash of system-generated temp password, `role` = "Marketing Executive", `status` = "Active". Welcome email sent with temporary credentials.
  * *Traceability:* STORY-1.2.1 AC-1, BR-1

* **TEST-EP1-USER-002 (Positive)**:
  * *Description:* Admin creates Admin user with all valid fields
  * *Input:* Admin authenticated. `employee_name = "Jane Smith"`, `mobile = "9123456789"`, `email = "jane@company.com"`, `role = "Admin"`, `status = "Active"`
  * *Expected Output:* HTTP 201 Created. User row created with `role = "Admin"`, `employee_id` = "EMP-00004". Welcome email sent.
  * *Traceability:* STORY-1.2.1 AC-1

* **TEST-EP1-USER-003 (Positive)**:
  * *Description:* Employee ID auto-generation — sequential and immutable
  * *Input:* Admin creates 3 users in sequence
  * *Expected Output:* Employee IDs generated as "EMP-00005", "EMP-00006", "EMP-00007". Format: EMP-XXXXX (5 digits, zero-padded). IDs sequential and never reused. Once assigned, ID cannot be changed.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-004 (Positive)**:
  * *Description:* System-generated password meets complexity requirements
  * *Input:* Inspect password generated for newly created user
  * *Expected Output:* Temporary password: ≥ 12 characters, contains uppercase, lowercase, number, and special character. Password is bcrypt hashed before storage. Plaintext password only exists in welcome email (one-time).
  * *Traceability:* STORY-1.2.1 AC-1, BR-1

* **TEST-EP1-USER-005 (Positive)**:
  * *Description:* Welcome email sent with temporary credentials
  * *Input:* Admin creates user with `email = "john@company.com"`
  * *Expected Output:* Email dispatched to "john@company.com" containing: employee_id, temporary password, login URL, instruction to change password on first login. Email sent within 30 seconds of user creation.
  * *Traceability:* STORY-1.2.1 AC-1

* **TEST-EP1-USER-006 (Positive)**:
  * *Description:* New user can log in with temporary credentials
  * *Input:* New user "john@company.com" logs in with temporary password from welcome email
  * *Expected Output:* HTTP 200 OK. Login successful. JWT returned. User redirected to password change page (first-login flow) or dashboard with prompt to change password.
  * *Traceability:* STORY-1.2.1 AC-1

* **TEST-EP1-USER-007 (Positive)**:
  * *Description:* Mobile number with various valid formats
  * *Input:* `mobile = "+91-98765-43210"`, `mobile = "(+91) 9876543210"`, `mobile = "9876543210"`
  * *Expected Output:* HTTP 201 Created for all. Mobile stored as VARCHAR. Format validation accepts common formats. Uniqueness checked after normalization (if implemented).
  * *Traceability:* STORY-1.2.1 (Field validation)

* **TEST-EP1-USER-008 (Positive)**:
  * *Description:* Create user with status = "Inactive"
  * *Input:* `status = "Inactive"`, all other fields valid
  * *Expected Output:* HTTP 201 Created. User created with status "Inactive". User cannot log in until activated by Admin.
  * *Traceability:* STORY-1.2.1 (Status management)

* **TEST-EP1-USER-009 (Positive)**:
  * *Description:* Boundary — employee name at maximum length (100 characters)
  * *Input:* `employee_name = "A" * 100`
  * *Expected Output:* HTTP 201 Created. Name stored successfully. VARCHAR(100) constraint satisfied.
  * *Traceability:* STORY-1.2.1 (Boundary)

* **TEST-EP1-USER-010 (Positive)**:
  * *Description:* Boundary — email at maximum length (254 characters)
  * *Input:* `email = "a" * 243 + "@company.com"`
  * *Expected Output:* HTTP 201 Created. Email stored successfully. VARCHAR(255) constraint satisfied.
  * *Traceability:* STORY-1.2.1 (Boundary)

---

### 2.2 STORY-1.2.1 — Create User (Negative)

* **TEST-EP1-USER-011 (Negative)**:
  * *Description:* Duplicate email — email already registered
  * *Input:* `email = "john@company.com"` (already exists in `users` table)
  * *Expected Output:* HTTP 409 Conflict. Error message: "Email already registered." User NOT created. No partial data inserted. Transaction rolled back.
  * *Traceability:* STORY-1.2.1 AC-2

* **TEST-EP1-USER-012 (Negative)**:
  * *Description:* Duplicate mobile number
  * *Input:* `mobile = "9876543210"` (already exists in `users` table)
  * *Expected Output:* HTTP 409 Conflict. Error message: "Mobile number already registered." User NOT created. UNIQUE constraint on mobile enforced.
  * *Traceability:* STORY-1.2.1 (Uniqueness)

* **TEST-EP1-USER-013 (Negative)**:
  * *Description:* Empty employee name
  * *Input:* `employee_name = ""`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Employee Name is required." Form validation triggers before DB insert.
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-014 (Negative)**:
  * *Description:* Empty mobile number
  * *Input:* `mobile = ""`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Mobile Number is required."
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-015 (Negative)**:
  * *Description:* Empty email
  * *Input:* `email = ""`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Email is required."
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-016 (Negative)**:
  * *Description:* Invalid email format
  * *Input:* `email = "not-an-email"`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Invalid email format."
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-017 (Negative)**:
  * *Description:* Invalid role — not in allowed enum
  * *Input:* `role = "Sales Manager"`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Invalid role. Allowed values: Admin, Marketing Executive." CHECK constraint or ENUM type rejects value.
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-018 (Negative)**:
  * *Description:* Invalid status — not in allowed enum
  * *Input:* `status = "Pending"`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Invalid status. Allowed values: Active, Inactive." CHECK constraint or ENUM type rejects value.
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-019 (Negative)**:
  * *Description:* Employee name exceeds maximum length (101 characters)
  * *Input:* `employee_name = "A" * 101`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Employee Name exceeds maximum length of 100 characters."
  * *Traceability:* STORY-1.2.1 (Boundary)

* **TEST-EP1-USER-020 (Negative)**:
  * *Description:* Email exceeds maximum length (255+ characters)
  * *Input:* `email = "a" * 250 + "@company.com"`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Email exceeds maximum length of 255 characters."
  * *Traceability:* STORY-1.2.1 (Boundary)

* **TEST-EP1-USER-021 (Negative)**:
  * *Description:* XSS payload in employee name
  * *Input:* `employee_name = "<script>alert('xss')</script>"`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request or sanitized input stored. No script execution. Name stored as literal text if sanitized.
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-022 (Negative)**:
  * *Description:* SQL injection in email field
  * *Input:* `email = "test'; DROP TABLE users; --@company.com"`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. No SQL injection. Parameterized query prevents execution. User NOT created.
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-023 (Negative)**:
  * *Description:* Non-admin user attempts to create user
  * *Input:* Marketing Executive authenticated. Attempts POST to `/api/users` with valid data.
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Admin access required." Request rejected at authorization middleware. No data created.
  * *Traceability:* STORY-1.2.1 AC-5

* **TEST-EP1-USER-024 (Negative)**:
  * *Description:* Unauthenticated user attempts to create user
  * *Input:* No JWT token. POST to `/api/users` with valid data.
  * *Expected Output:* HTTP 401 Unauthorized. Error message: "Authentication required."
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-025 (Negative)**:
  * *Description:* Missing mandatory field — role
  * *Input:* `role = null` or omitted, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Role is required." NOT NULL constraint would also trigger at DB level.
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-026 (Negative)**:
  * *Description:* Missing mandatory field — status
  * *Input:* `status = null` or omitted, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Status is required." Default value "Active" may apply if configured, but explicit requirement says mandatory.
  * *Traceability:* STORY-1.2.1 (Validation)

---

### 2.3 STORY-1.2.1 — Edit User

* **TEST-EP1-USER-027 (Positive)**:
  * *Description:* Admin edits user name and mobile
  * *Input:* Admin authenticated. `employee_id = "EMP-00002"`, `employee_name = "John Updated"`, `mobile = "9999999999"`
  * *Expected Output:* HTTP 200 OK. User row updated. `employee_name` and `mobile` changed. `employee_id`, `email`, `role`, `password` unchanged. Audit log records change with old and new values.
  * *Traceability:* STORY-1.2.1 (Edit)

* **TEST-EP1-USER-028 (Positive)**:
  * *Description:* Admin changes user role from Marketing Executive to Admin
  * *Input:* `employee_id = "EMP-00002"`, `role = "Admin"` (previously "Marketing Executive")
  * *Expected Output:* HTTP 200 OK. Role updated in database. New permissions take effect on user's NEXT login. Current session (if active) retains old permissions until logout.
  * *Traceability:* STORY-1.2.1 AC-4

* **TEST-EP1-USER-029 (Positive)**:
  * *Description:* Verify role change takes effect on next login
  * *Input:* User "EMP-00002" was changed from Marketing → Admin. User logs out and logs back in.
  * *Expected Output:* HTTP 200 OK. JWT contains `role = "Admin"`. User redirected to Admin Dashboard. Can access User Management screens.
  * *Traceability:* STORY-1.2.1 AC-4

* **TEST-EP1-USER-030 (Negative)**:
  * *Description:* Admin attempts to edit user with duplicate email
  * *Input:* `employee_id = "EMP-00002"`, `email = "john@company.com"` (already belongs to EMP-00003)
  * *Expected Output:* HTTP 409 Conflict. Error message: "Email already registered." Update rolled back. Original email preserved.
  * *Traceability:* STORY-1.2.1 (Edit validation)

* **TEST-EP1-USER-031 (Negative)**:
  * *Description:* Admin attempts to edit user with duplicate mobile
  * *Input:* `employee_id = "EMP-00002"`, `mobile = "9876543210"` (already belongs to EMP-00003)
  * *Expected Output:* HTTP 409 Conflict. Error message: "Mobile number already registered." Update rolled back.
  * *Traceability:* STORY-1.2.1 (Edit validation)

* **TEST-EP1-USER-032 (Negative)**:
  * *Description:* Admin attempts to change employee_id
  * *Input:* `employee_id = "EMP-00002"`, attempt to set `employee_id = "EMP-99999"`
  * *Expected Output:* HTTP 400 Bad Request or field ignored. Error message: "Employee ID is immutable." Employee ID cannot be modified after creation.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-033 (Negative)**:
  * *Description:* Marketing Executive attempts to edit another user
  * *Input:* Marketing Executive authenticated. Attempts PUT `/api/users/EMP-00003` with valid data.
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Admin access required."
  * *Traceability:* STORY-1.2.1 AC-5

* **TEST-EP1-USER-034 (Negative)**:
  * *Description:* Edit non-existent user
  * *Input:* `employee_id = "EMP-99999"` (does not exist)
  * *Expected Output:* HTTP 404 Not Found. Error message: "User not found."
  * *Traceability:* STORY-1.2.1 (Edit)

---

### 2.4 STORY-1.2.1 — Deactivate User

* **TEST-EP1-USER-035 (Positive)**:
  * *Description:* Admin deactivates an Active user
  * *Input:* Admin authenticated. `employee_id = "EMP-00002"`, `status = "Inactive"`
  * *Expected Output:* HTTP 200 OK. User status updated to "Inactive". User can no longer log in. Existing JWT tokens for this user invalidated (or rejected on next request). Lead assignments remain with deactivated user.
  * *Traceability:* STORY-1.2.1 AC-3

* **TEST-EP1-USER-036 (Negative)**:
  * *Description:* Deactivated user attempts to log in
  * *Input:* `email = "john@company.com"` (status = "Inactive"), correct password
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Account is inactive. Contact your administrator." Login rejected. Failed attempt counter NOT incremented.
  * *Traceability:* STORY-1.2.1 AC-3

* **TEST-EP1-USER-037 (Positive)**:
  * *Description:* Deactivated user's lead assignments remain unchanged
  * *Input:* Inspect leads table for leads assigned to deactivated user "EMP-00002"
  * *Expected Output:* `assigned_to` still references "EMP-00002". No automatic reassignment. Leads still visible in reports with deactivated user's name.
  * *Traceability:* STORY-1.2.1 AC-3

* **TEST-EP1-USER-038 (Positive)**:
  * *Description:* Admin reactivates a deactivated user
  * *Input:* Admin sets `status = "Active"` for "EMP-00002"
  * *Expected Output:* HTTP 200 OK. User can log in again with existing password. Lead assignments restored (were never removed). Audit log records reactivation.
  * *Traceability:* STORY-1.2.1 AC-3

* **TEST-EP1-USER-039 (Negative)**:
  * *Description:* Deactivate user from UI — verify no hard delete option
  * *Input:* Inspect User Management UI for delete button/functionality
  * *Expected Output:* No "Delete" button visible. Only "Deactivate" option available. API endpoint `/api/users/{id}/delete` returns 404 or 403 if attempted directly.
  * *Traceability:* STORY-1.2.1 BR-2

* **TEST-EP1-USER-040 (Negative)**:
  * *Description:* Attempt hard delete via direct API call
  * *Input:* DELETE `/api/users/EMP-00002` (even if endpoint exists)
  * *Expected Output:* HTTP 403 Forbidden or 404 Not Found. Error message: "User deletion is not permitted. Use deactivation instead." Referential integrity preserved.
  * *Traceability:* STORY-1.2.1 BR-2

---

### 2.5 STORY-1.2.1 — Role Change & Permission

* **TEST-EP1-USER-041 (Positive)**:
  * *Description:* Role change from Marketing Executive to Admin — immediate UI access after re-login
  * *Input:* User "EMP-00002" re-logins after role change to Admin
  * *Expected Output:* User sees Admin Dashboard. User Management menu visible. Can create/edit users. All Admin permissions active.
  * *Traceability:* STORY-1.2.1 AC-4

* **TEST-EP1-USER-042 (Positive)**:
  * *Description:* Role change from Admin to Marketing Executive — restricted access after re-login
  * *Input:* User "EMP-00001" re-logins after role change to Marketing Executive
  * *Expected Output:* User sees Marketing Dashboard. User Management menu hidden. Access to `/api/users` returns 403. Can only view own profile and assigned leads.
  * *Traceability:* STORY-1.2.1 AC-4

* **TEST-EP1-USER-043 (Positive)**:
  * *Description:* Active session retains old role until logout
  * *Input:* User logged in as Marketing Executive. Admin changes role to Admin. User continues browsing without logout.
  * *Expected Output:* User retains Marketing Executive permissions during current session. Can still access Marketing-only routes. Role change applies only after re-authentication (new JWT).
  * *Traceability:* STORY-1.2.1 AC-4

* **TEST-EP1-USER-044 (Negative)**:
  * *Description:* Marketing Executive attempts direct URL access to User Management
  * *Input:* Marketing Executive navigates directly to `/admin/users` or `/api/users`
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Admin access required." Redirected to Marketing Dashboard or access-denied page.
  * *Traceability:* STORY-1.2.1 AC-5

* **TEST-EP1-USER-045 (Negative)**:
  * *Description:* Marketing Executive attempts to access another user's profile
  * *Input:* Marketing Executive navigates to `/api/users/EMP-00001` (Admin's profile)
  * *Expected Output:* HTTP 403 Forbidden. Error message: "You can only view your own profile." or "Admin access required."
  * *Traceability:* STORY-1.2.1 AC-5

---

### 2.6 STORY-1.2.1 — Access Control & Authorization

* **TEST-EP1-USER-046 (Positive)**:
  * *Description:* Admin can view all users list
  * *Input:* Admin requests GET `/api/users`
  * *Expected Output:* HTTP 200 OK. Returns array of all users with fields: `employee_id`, `employee_name`, `email`, `mobile`, `role`, `status`. Password excluded. Pagination supported.
  * *Traceability:* STORY-1.2.1 (Access control)

* **TEST-EP1-USER-047 (Positive)**:
  * *Description:* Admin can view specific user by ID
  * *Input:* Admin requests GET `/api/users/EMP-00002`
  * *Expected Output:* HTTP 200 OK. Returns full user details. Password hash excluded from response.
  * *Traceability:* STORY-1.2.1 (Access control)

* **TEST-EP1-USER-048 (Positive)**:
  * *Description:* Marketing Executive can view own profile
  * *Input:* Marketing Executive requests GET `/api/users/me` or `/api/users/EMP-00002` (self)
  * *Expected Output:* HTTP 200 OK. Returns own profile with `employee_id`, `employee_name`, `email`, `mobile`, `role`, `status`. Password excluded.
  * *Traceability:* STORY-1.2.1 (Access control)

* **TEST-EP1-USER-049 (Negative)**:
  * *Description:* Marketing Executive cannot view other users list
  * *Input:* Marketing Executive requests GET `/api/users`
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Admin access required."
  * *Traceability:* STORY-1.2.1 AC-5

* **TEST-EP1-USER-050 (Negative)**:
  * *Description:* Unauthenticated user cannot access User Management
  * *Input:* No JWT. GET `/api/users`
  * *Expected Output:* HTTP 401 Unauthorized. Error message: "Authentication required."
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-051 (Security)**:
  * *Description:* Verify password hash never returned in API responses
  * *Input:* Admin requests GET `/api/users/EMP-00001`
  * *Expected Output:* Response JSON contains all user fields EXCEPT `password`. Password hash is NEVER serialized in API responses. SQL SELECT excludes password column or explicitly omits it.
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-052 (Security)**:
  * *Description:* Verify role-based access control (RBAC) on all user endpoints
  * *Input:* Test all CRUD operations on `/api/users` with both Admin and Marketing Executive tokens
  * *Expected Output:* Admin: GET/POST/PUT allowed. Marketing Executive: All return 403. Only `/api/users/me` (self) allowed for Marketing Executive.
  * *Traceability:* STORY-1.2.1 AC-5

---

### 2.7 STORY-1.2.1 — Audit Log for User Management

* **TEST-EP1-USER-053 (Positive)**:
  * *Description:* User creation logged in Audit Log
  * *Input:* Admin creates user "EMP-00005"
  * *Expected Output:* `audit_log` row: `action` = "USER_CREATED", `target_user_id` = "EMP-00005", `performed_by` = "EMP-00001" (Admin), `timestamp` = current UTC, `details` = JSON with created fields (NO password). Row committed in same transaction as user creation.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-054 (Positive)**:
  * *Description:* User edit logged in Audit Log with old and new values
  * *Input:* Admin changes name from "John Doe" to "John Smith" for "EMP-00005"
  * *Expected Output:* `audit_log` row: `action` = "USER_UPDATED", `details` = JSON with `field: "employee_name", old_value: "John Doe", new_value: "John Smith"`. Change tracked per field or as full record diff.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-055 (Positive)**:
  * *Description:* User status change logged in Audit Log
  * *Input:* Admin deactivates "EMP-00005" (Active → Inactive)
  * *Expected Output:* `audit_log` row: `action` = "USER_STATUS_CHANGED", `details` = `{"status": {"old": "Active", "new": "Inactive"}}`. Timestamp and Admin ID recorded.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-056 (Positive)**:
  * *Description:* User role change logged in Audit Log
  * *Input:* Admin changes role of "EMP-00005" from Marketing Executive to Admin
  * *Expected Output:* `audit_log` row: `action` = "USER_ROLE_CHANGED", `details` = `{"role": {"old": "Marketing Executive", "new": "Admin"}}`. Previous role preserved for history.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-057 (Security)**:
  * *Description:* Verify no password in Audit Log for user creation
  * *Input:* Inspect `audit_log` rows where `action` = "USER_CREATED"
  * *Expected Output:* No password, temporary password, or password hash in `details` column. Only metadata (name, email, role, status) logged.
  * *Traceability:* STORY-1.1.1 BR-1, STORY-1.2.1 BR-3

* **TEST-EP1-USER-058 (Positive)**:
  * *Description:* Audit Log queryable by Admin for user activity history
  * *Input:* Admin requests GET `/api/audit-log?user_id=EMP-00005`
  * *Expected Output:* HTTP 200 OK. Returns all audit entries for user EMP-00005: creation, edits, status changes, role changes, logins. Sorted by timestamp descending.
  * *Traceability:* STORY-1.2.1 BR-3

---

### 2.8 STORY-1.2.1 — Business Rules Validation

* **TEST-EP1-USER-059 (Positive)**:
  * *Description:* Employee ID format verification — EMP-XXXXX
  * *Input:* Create 5 users sequentially
  * *Expected Output:* IDs: EMP-00001, EMP-00002, EMP-00003, EMP-00004, EMP-00005. Format: "EMP-" + 5-digit zero-padded sequential number. No gaps, no duplicates, no manual override possible.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-060 (Positive)**:
  * *Description:* Employee ID immutability — cannot be changed after creation
  * *Input:* Attempt to UPDATE `users` table SET `employee_id = 'EMP-99999'` WHERE `employee_id = 'EMP-00005'`
  * *Expected Output:* If DB constraint exists: PostgreSQL error — cannot update generated/primary key column. If application-level: HTTP 400 Bad Request. Employee ID permanently tied to user.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-061 (Positive)**:
  * *Description:* Deleting user is not permitted — only deactivation
  * *Input:* Attempt DELETE on `users` table row for "EMP-00005"
  * *Expected Output:* If ON DELETE RESTRICT on leads: PostgreSQL foreign key violation. If application-level: HTTP 403 Forbidden. User row preserved. Only `status` can be changed to "Inactive".
  * *Traceability:* STORY-1.2.1 BR-2

* **TEST-EP1-USER-062 (Positive)**:
  * *Description:* Referential integrity — leads assigned to deactivated user remain intact
  * *Input:* Create lead assigned to "EMP-00005". Deactivate "EMP-00005". Query leads table.
  * *Expected Output:* Lead row still has `assigned_to = 'EMP-00005'`. No CASCADE delete or SET NULL triggered. Foreign key constraint allows inactive reference (if designed) or application handles inactive assignee display.
  * *Traceability:* STORY-1.2.1 BR-2, AC-3

* **TEST-EP1-USER-063 (Positive)**:
  * *Description:* Referential integrity — audit records preserve user reference even if user deactivated
  * *Input:* Inspect `audit_log` for entries performed by "EMP-00005" (now deactivated)
  * *Expected Output:* Audit records still show `performed_by = 'EMP-00005'`. No orphaned records. User name may show as "John Doe (Inactive)" or remain as original name.
  * *Traceability:* STORY-1.2.1 BR-2

* **TEST-EP1-USER-064 (Positive)**:
  * *Description:* Account lockout threshold configurable by Admin in System Settings
  * *Input:* Admin navigates to System Settings. Changes lockout threshold from 5 to 3 attempts. Changes lockout duration from 15 to 30 minutes.
  * *Expected Output:* Settings saved. New threshold active immediately. Next login attempt: 3 failed attempts trigger 30-minute lockout. Previous lockout records unaffected.
  * *Traceability:* STORY-1.1.1 BR-3

* **TEST-EP1-USER-065 (Positive)**:
  * *Description:* System-generated password complexity — meets policy
  * *Input:* Create 10 users and inspect generated passwords
  * *Expected Output:* All 10 passwords: ≥ 12 chars, ≥ 1 uppercase, ≥ 1 lowercase, ≥ 1 digit, ≥ 1 special char. No dictionary words. Cryptographically random generation.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-066 (Positive)**:
  * *Description:* Welcome email contains only temporary credentials — no permanent password
  * *Input:* Inspect welcome email sent to new user
  * *Expected Output:* Email contains: employee_id, temporary password (plaintext, one-time), login URL, instruction to change password. No reference to permanent or default password.
  * *Traceability:* STORY-1.2.1 AC-1

---

## 3. Cross-Cutting Security Test Cases

* **TEST-EP1-SEC-001 (Security)**:
  * *Description:* CSRF protection on all state-changing endpoints
  * *Input:* Attempt POST/PUT/DELETE to `/api/users` without valid CSRF token (if session-based) or with tampered Origin header
  * *Expected Output:* HTTP 403 Forbidden. "Invalid CSRF token" or "Origin not allowed." State-changing requests rejected without valid CSRF protection.
  * *Traceability:* General Security

* **TEST-EP1-SEC-002 (Security)**:
  * *Description:* HTTPS enforcement — no plaintext HTTP access
  * *Input:* Attempt HTTP (non-SSL) request to login endpoint
  * *Expected Output:* HTTP 301/308 redirect to HTTPS. Or connection refused. No credentials transmitted over plaintext.
  * *Traceability:* General Security

* **TEST-EP1-SEC-003 (Security)**:
  * *Description:* Secure cookie attributes (if cookie-based sessions)
  * *Input:* Inspect Set-Cookie header after login with Remember Me
  * *Expected Output:* Cookie has: `HttpOnly`, `Secure`, `SameSite=Strict` or `SameSite=Lax`. No `Secure` flag missing. No cookie accessible via JavaScript.
  * *Traceability:* General Security

* **TEST-EP1-SEC-004 (Security)**:
  * *Description:* Rate limiting on login endpoint
  * *Input:* Send 100 login requests from same IP within 1 minute
  * *Expected Output:* After threshold (e.g., 20 requests/min), HTTP 429 Too Many Requests. "Rate limit exceeded. Please try again later." IP temporarily blocked.
  * *Traceability:* General Security

* **TEST-EP1-SEC-005 (Security)**:
  * *Description:* Rate limiting on user creation endpoint
  * *Input:* Admin sends 50 user creation requests within 1 minute
  * *Expected Output:* After threshold, HTTP 429 Too Many Requests. Prevents mass user creation abuse. Legitimate Admin operations not blocked under normal usage.
  * *Traceability:* General Security

* **TEST-EP1-SEC-006 (Security)**:
  * *Description:* JWT secret/key rotation
  * *Input:* System admin rotates JWT signing key. Existing tokens validated.
  * *Expected Output:* Old tokens rejected (HTTP 401). New tokens issued with new key. Graceful transition with no downtime.
  * *Traceability:* General Security

* **TEST-EP1-SEC-007 (Security)**:
  * *Description:* Password history — prevent reuse of last N passwords
  * *Input:* User changes password to same as previous password
  * *Expected Output:* HTTP 400 Bad Request. Error: "New password cannot be same as current password." If password history stored: "Password cannot match any of your last 5 passwords."
  * *Traceability:* General Security

* **TEST-EP1-SEC-008 (Security)**:
  * *Description:* Secure headers in all API responses
  * *Input:* Inspect response headers for any API endpoint
  * *Expected Output:* Headers include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Content-Security-Policy` defined. No `Server` header revealing technology stack.
  * *Traceability:* General Security

* **TEST-EP1-SEC-009 (Security)**:
  * *Description:* Input validation on all fields — length, type, format
  * *Input:* Fuzz all input fields with: empty strings, null bytes, Unicode control characters, 10KB strings, binary data
  * *Expected Output:* All invalid inputs rejected with HTTP 400. No server crashes. No data corruption. PostgreSQL type constraints enforce data integrity.
  * *Traceability:* General Security

* **TEST-EP1-SEC-010 (Security)**:
  * *Description:* SQL injection across all endpoints with user input
  * *Input:* Test all endpoints accepting user input: login, user creation, user edit, search with payloads: `' OR '1'='1`, `'; DROP TABLE users; --`, `1; SELECT * FROM users`
  * *Expected Output:* All payloads safely handled via parameterized queries/prepared statements. No unauthorized data access. No schema modification. PostgreSQL logs show no injection attempts.
  * *Traceability:* General Security

---
 ## Summary

| FEAT-1.2: User Management — Create User (Positive) | 10 |
| FEAT-1.2: User Management — Create User (Negative) | 16 |
| FEAT-1.2: User Management — Edit User | 8 |
| FEAT-1.2: User Management — Deactivate User | 6 |
| FEAT-1.2: User Management — Role Change & Permission | 5 |
| FEAT-1.2: User Management — Access Control & Authorization | 7 |
| FEAT-1.2: User Management — Audit Log for User Management | 6 |
| FEAT-1.2: User Management — Business Rules Validation | 8 |
| Cross-Cutting Security Test Cases | 10 |
| **Grand Total** | **137** |

---
 
