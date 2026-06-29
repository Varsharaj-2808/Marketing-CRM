CRM Database Schema (Text Format)
1. Users
Column	Type	Description
id	UUID (PK)	Primary Key
seq	Auto Number	Sequential ID
employee_id	Formula (EMP-00001)	Employee ID
name	Text	User Name
email	Email	Email Address
mobile	Phone	Mobile Number
role	Enum	Admin / Marketing
status	Enum	Active / Inactive
failed_login_attempts	Integer	Failed Login Count
lockout_until	Datetime	Account Lock Time
password_hash	Text	Hashed Password
created_at	Timestamp	Created Date
updated_at	Timestamp	Updated Date
2. Leads
Column	Type	Description
id	UUID (PK)	Primary Key
seq	Auto Number	Sequence
lead_id	Formula (DY-YYYY-00001)	Lead Number
company_name	Text	Company Name
contact_person	Text	Contact Person
mobile_number	Phone	Contact Number
email	Email	Email Address
website	URL	Website
city	Text	City
lead_source	Enum	Lead Source
category	FK → Business Categories	Business Category
sub_category	FK → Business Sub Categories	Sub Category
service_interested	Multi Select	Interested Services
priority	Enum	Hot / Warm / Cold
estimated_value	Currency	Estimated Value
assigned_to	FK → Users	Assigned User
stage	Enum	Lead Stage
lost_reason	Enum	Lost Reason
lost_reason_note	Text	Lost Reason Notes
final_deal_value	Currency	Final Deal Value
closure_date	Date	Closed Date
proposal_value	Currency	Proposal Amount
created_at	Timestamp	Created Date
updated_at	Timestamp	Updated Date
3. Business Categories
Column	Type
id	UUID (PK)
category_name	Text
status	Active / Inactive
created_at	Timestamp
4. Business Sub Categories
Column	Type
id	UUID (PK)
sub_category_name	Text
category	FK → Business Categories
status	Active / Inactive
created_at	Timestamp
5. Lead Activities
Column	Type
id	UUID (PK)
activity_summary	Text
lead	FK → Leads
follow_up_date	Date
activity_channel	Enum
discussion_notes	Long Text
outcome	Enum
next_follow_up_date	Datetime
proposal_amount	Currency
stage_at_log	Enum
created_by	FK → Users
created_at	Timestamp
addendum_notes	Long Text
addendum_by	FK → Users
addendum_at	Datetime
6. Lead History
Column	Type
id	UUID (PK)
seq	Auto Number
change_summary	Text
lead	FK → Leads
field_name	Text
old_value	Text
new_value	Text
changed_by	FK → Users
changed_at	Timestamp
reason	Long Text
7. Audit Logs
Column	Type
id	UUID (PK)
seq	Auto Number
action_type	Text
actor	FK → Users
entity_affected	Text
entity_id	Text
result	Success / Failure
ip_address	Text
details	Long Text
created_at	Timestamp
Relationships
Users
Users (1) → (M) Leads
Leads.assigned_to → Users.id
Users (1) → (M) Lead Activities
LeadActivities.created_by → Users.id
LeadActivities.addendum_by → Users.id
Users (1) → (M) Lead History
LeadHistory.changed_by → Users.id
Users (1) → (M) Audit Logs
AuditLogs.actor → Users.id
Business Categories
Business Categories (1) → (M) Business Sub Categories
BusinessSubCategories.category → BusinessCategories.id
Business Categories (1) → (M) Leads
Leads.category → BusinessCategories.id
Business Sub Categories
Business Sub Categories (1) → (M) Leads
Leads.sub_category → BusinessSubCategories.id
Leads
Leads (1) → (M) Lead Activities
LeadActivities.lead → Leads.id
Leads (1) → (M) Lead History
LeadHistory.lead → Leads.id
Overall Database Flow
Users
 ├── Assigned To ─────────────► Leads
 ├── Created By ──────────────► Lead Activities
 ├── Addendum By ─────────────► Lead Activities
 ├── Changed By ──────────────► Lead History
 └── Actor ───────────────────► Audit Logs

Business Categories
 ├──► Business Sub Categories
 └──► Leads

Business Sub Categories
 └──► Leads

Leads
 ├──► Lead Activities
 └──► Lead History

2. [FEAT-1.2: User & Role Management (Admin Only)](#2-feat-12-user--role-management-admin-only)
   - [2.1 Create User (Positive)](#21-story-121-create-user-positive)
   - [2.2 Create User (Negative)](#22-story-121-create-user-negative)
   - [2.3 Edit User](#23-story-121-edit-user)
   - [2.4 Deactivate User](#24-story-121-deactivate-user)
   - [2.5 Role Change & Permission](#25-story-121-role-change--permission)
   - [2.6 Access Control & Authorization](#26-story-121-access-control--authorization)
   - [2.7 Audit Log for User Management](#27-story-121-audit-log-for-user-management)
   - [2.8 Business Rules Validation](#28-story-121-business-rules-validation)
   - [2.9 Audit Log API](#29-story-121-audit-log-api-query--view)
   - [2.10 Refresh Token Expiry](#210-story-121-refresh-token-expiry)
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

* **TEST-EP1-USER-038 (Positive)**:
  * *Description:* Admin reactivates a deactivated user
  * *Input:* Admin sets `status = "Active"` for "EMP-00002"
  * *Expected Output:* HTTP 200 OK. User can log in again with existing password. Lead assignments restored (were never removed). Audit log records reactivation.
  * *Traceability:* STORY-1.2.1 AC-3

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

* **TEST-EP1-USER-043 (Positive)**:
  * *Description:* Active session retains old role until logout
  * *Input:* User logged in as Marketing Executive. Admin changes role to Admin. User continues browsing without logout.
  * *Expected Output:* User retains Marketing Executive permissions during current session. Can still access Marketing-only routes. Role change applies only after re-authentication (new JWT).
  * *Traceability:* STORY-1.2.1 AC-4

---

### 2.6 STORY-1.2.1 — Access Control & Authorization

* **TEST-EP1-USER-044 (Negative)**:
  * *Description:* Marketing Executive attempts direct URL access to User Management
  * *Input:* Marketing Executive navigates directly to `/admin/users` or `/api/users`
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Admin access required." Redirected to Marketing Dashboard or access-denied page.
  * *Traceability:* STORY-1.2.1 AC-5

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

* **TEST-EP1-USER-057 (Security)**:
  * *Description:* Verify no password in Audit Log for user creation
  * *Input:* Inspect `audit_log` rows where `action` = "USER_CREATED"
  * *Expected Output:* No password, temporary password, or password hash in `details` column. Only metadata (name, email, role, status) logged.
  * *Traceability:* STORY-1.1.1 BR-1, STORY-1.2.1 BR-3

---

### 2.8 STORY-1.2.1 — Business Rules Validation

* **TEST-EP1-USER-059 (Positive)**:
  * *Description:* Employee ID format verification — EMP-XXXXX
  * *Input:* Create 5 users sequentially
  * *Expected Output:* IDs: EMP-00001, EMP-00002, EMP-00003, EMP-00004, EMP-00005. Format: "EMP-" + 5-digit zero-padded sequential number. No gaps, no duplicates, no manual override possible.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-060 (Negative)**:
  * *Description:* Employee ID immutable — changing employee_id returns 400
  * *Input:* `employee_id = "EMP-00002"`, attempt to set `employee_id = "EMP-99999"`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Employee ID cannot be changed."
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-064 (Positive)**:
  * *Description:* System settings API — Admin can update lockout threshold
  * *Input:* Admin puts `{ value: "3" }` to `/api/admin/settings/LOCKOUT_THRESHOLD`
  * *Expected Output:* HTTP 200 OK. System setting updated. Value stored and returned in response.
  * *Traceability:* STORY-1.1.1 BR-3

* **TEST-EP1-USER-065 (Positive)**:
  * *Description:* System-generated password complexity — meets policy
  * *Input:* Generate 10 temp passwords via `generateTempPassword()`
  * *Expected Output:* All 10 passwords: ≥ 12 chars, ≥ 1 uppercase, ≥ 1 lowercase, ≥ 1 digit, ≥ 1 special char.
  * *Traceability:* STORY-1.2.1 BR-1

> **Note:** Test numbers USER-064 and USER-065 are reused across sections 2.8 and 2.9 to match the actual test file numbering in `userManagement.test.js`.

---

### 2.9 STORY-1.2.1 — Audit Log API (Query & View)

* **TEST-EP1-USER-061 (Positive)**:
  * *Description:* Admin can list audit logs with pagination
  * *Input:* Admin requests GET `/api/admin/audit-log` with Authorization header
  * *Expected Output:* HTTP 200 OK. `res.body.success === true`. Returns array of audit log entries. Response includes `pagination` object.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-062 (Positive)**:
  * *Description:* Admin can filter audit logs by action type
  * *Input:* Admin requests GET `/api/admin/audit-log?action=USER_CREATED` with Authorization header
  * *Expected Output:* HTTP 200 OK. Only audit logs with `action = "USER_CREATED"` returned.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-063 (Negative)**:
  * *Description:* Marketing Executive cannot access audit logs
  * *Input:* Marketing Executive requests GET `/api/admin/audit-log` with Authorization header
  * *Expected Output:* HTTP 403 Forbidden.
  * *Traceability:* STORY-1.2.1 AC-5

* **TEST-EP1-USER-064 (Negative)**:
  * *Description:* Unauthenticated user cannot access audit logs
  * *Input:* No JWT token. GET `/api/admin/audit-log`
  * *Expected Output:* HTTP 401 Unauthorized.
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-065 (Positive)**:
  * *Description:* Admin can view specific audit log entry by ID
  * *Input:* Admin requests GET `/api/admin/audit-log/{id}` with Authorization header
  * *Expected Output:* HTTP 200 OK. Returns full audit log entry with `id`, `user_id`, `email`, `action`, `resource`, `resourceId`, `details`, `ipAddress`, `userAgent`, `result`, `createdAt`.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-066 (Negative)**:
  * *Description:* View non-existent audit log entry returns 404
  * *Input:* Admin requests GET `/api/admin/audit-log/non-existent` with Authorization header
  * *Expected Output:* HTTP 404 Not Found. Error message: "Audit log not found."
  * *Traceability:* STORY-1.2.1 (Error handling)

---

### 2.10 STORY-1.2.1 — Refresh Token Expiry

* **TEST-EP1-USER-067 (Negative)**:
  * *Description:* Remember Me refresh token expired after 30 days + 1 second — must re-authenticate
  * *Input:* `remember_me = true` during login issues 30-day refresh token. No activity for 30 days + 1 second. Attempt to use expired refresh token via `POST /api/auth/refresh` with `{ refreshToken: "<expired_token>" }`.
  * *Expected Output:* HTTP 401 Unauthorized. `jwt.verify()` throws `TokenExpiredError`. Error message: "Invalid token." User must log in again with email/password. No silent re-authentication possible.
  * *Traceability:* STORY-1.1.1 (Token management)

* **TEST-EP1-USER-068 (Positive)**:
  * *Description:* Valid refresh token returns new access and refresh tokens
  * *Input:* Valid (non-expired) refresh token sent to `POST /api/auth/refresh`
  * *Expected Output:* HTTP 200 OK. Response contains `accessToken` and `refreshToken`. New refresh token stored in database (bcrypt hashed). Old refresh token becomes unusable.
  * *Traceability:* STORY-1.1.1 (Token management)

* **TEST-EP1-USER-069 (Negative)**:
  * *Description:* Missing refresh token in request body
  * *Input:* `POST /api/auth/refresh` with empty body `{}`
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Refresh token required."
  * *Traceability:* STORY-1.1.1 (Validation)

---

## 3. Cross-Cutting Security Test Cases

* **TEST-EP1-SEC-004 (Security)**:
  * *Description:* Rate limiting on login endpoint — 429 after 20+ rapid requests
  * *Input:* Send 25 rapid concurrent login requests from same IP, varies email each call to avoid lockout
  * *Expected Output:* At least 1 response returns HTTP 429 Too Many Requests after exceeding 20 req/min threshold.
  * *Traceability:* General Security

* **TEST-EP1-SEC-008 (Security)**:
  * *Description:* Secure headers in all API responses
  * *Input:* Inspect `X-Content-Type-Options` and `X-Frame-Options` headers on GET `/api/health`
  * *Expected Output:* `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` present. (Helmet middleware configured.)
  * *Traceability:* General Security

---

## Summary

| Section | Tests |
|---|---|---|
| FEAT-1.2: User Management — Create User (Positive) | 10 |
| FEAT-1.2: User Management — Create User (Negative) | 16 |
| FEAT-1.2: User Management — Edit User | 8 |
| FEAT-1.2: User Management — Deactivate User | 4 |
| FEAT-1.2: User Management — Role Change & Permission | 2 |
| FEAT-1.2: User Management — Access Control & Authorization | 8 |
| FEAT-1.2: User Management — Audit Log for User Management | 3 |
| FEAT-1.2: User Management — Business Rules Validation | 4 |
| FEAT-1.2: User Management — Audit Log API | 6 |
| FEAT-1.2: User Management — Refresh Token Expiry | 3 |
| Cross-Cutting Security Test Cases | 2 |
| **Grand Total** | **66** |

---
 
