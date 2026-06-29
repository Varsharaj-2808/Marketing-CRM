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
category	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Business Categories	Business Category
sub_category	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Business Sub Categories	Sub Category
service_interested	Multi Select	Interested Services
priority	Enum	Hot / Warm / Cold
estimated_value	Currency	Estimated Value
assigned_to	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Users	Assigned User
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
category	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Business Categories
status	Active / Inactive
created_at	Timestamp
5. Lead Activities
Column	Type
id	UUID (PK)
activity_summary	Text
lead	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Leads
follow_up_date	Date
activity_channel	Enum
discussion_notes	Long Text
outcome	Enum
next_follow_up_date	Datetime
proposal_amount	Currency
stage_at_log	Enum
created_by	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Users
created_at	Timestamp
addendum_notes	Long Text
addendum_by	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Users
addendum_at	Datetime
6. Lead History
Column	Type
id	UUID (PK)
seq	Auto Number
change_summary	Text
lead	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Leads
field_name	Text
old_value	Text
new_value	Text
changed_by	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Users
changed_at	Timestamp
reason	Long Text
7. Audit Logs
Column	Type
id	UUID (PK)
seq	Auto Number
action_type	Text
actor	FK ÃŽâ€œÃƒÂ¥Ãƒâ€  Users
entity_affected	Text
entity_id	Text
result	Success / Failure
ip_address	Text
details	Long Text
created_at	Timestamp
Relationships
Users
Users (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Leads
Leads.assigned_to ÃŽâ€œÃƒÂ¥Ãƒâ€  Users.id
Users (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Lead Activities
LeadActivities.created_by ÃŽâ€œÃƒÂ¥Ãƒâ€  Users.id
LeadActivities.addendum_by ÃŽâ€œÃƒÂ¥Ãƒâ€  Users.id
Users (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Lead History
LeadHistory.changed_by ÃŽâ€œÃƒÂ¥Ãƒâ€  Users.id
Users (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Audit Logs
AuditLogs.actor ÃŽâ€œÃƒÂ¥Ãƒâ€  Users.id
Business Categories
Business Categories (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Business Sub Categories
BusinessSubCategories.category ÃŽâ€œÃƒÂ¥Ãƒâ€  BusinessCategories.id
Business Categories (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Leads
Leads.category ÃŽâ€œÃƒÂ¥Ãƒâ€  BusinessCategories.id
Business Sub Categories
Business Sub Categories (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Leads
Leads.sub_category ÃŽâ€œÃƒÂ¥Ãƒâ€  BusinessSubCategories.id
Leads
Leads (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Lead Activities
LeadActivities.lead ÃŽâ€œÃƒÂ¥Ãƒâ€  Leads.id
Leads (1) ÃŽâ€œÃƒÂ¥Ãƒâ€  (M) Lead History
LeadHistory.lead ÃŽâ€œÃƒÂ¥Ãƒâ€  Leads.id
Overall Database Flow
Users
 ÃŽâ€œÃƒÂ¶Ã‚Â£ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ Assigned To ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Leads
 ÃŽâ€œÃƒÂ¶Ã‚Â£ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ Created By ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Lead Activities
 ÃŽâ€œÃƒÂ¶Ã‚Â£ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ Addendum By ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Lead Activities
 ÃŽâ€œÃƒÂ¶Ã‚Â£ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ Changed By ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Lead History
 ÃŽâ€œÃƒÂ¶ÃƒÂ¶ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ Actor ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Audit Logs

Business Categories
 ÃŽâ€œÃƒÂ¶Ã‚Â£ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Business Sub Categories
 ÃŽâ€œÃƒÂ¶ÃƒÂ¶ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Leads

Business Sub Categories
 ÃŽâ€œÃƒÂ¶ÃƒÂ¶ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Leads

Leads
 ÃŽâ€œÃƒÂ¶Ã‚Â£ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Lead Activities
 ÃŽâ€œÃƒÂ¶ÃƒÂ¶ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ¶Ãƒâ€¡ÃŽâ€œÃƒÂ»Ã¢â€¢â€˜ Lead History

1. [FEAT-1.1: User Login](#1-feat-11-user-login)
   - [STORY-1.1.1 — Positive Login Scenarios](#11-story-111--positive-login-scenarios)
   - [STORY-1.1.1 — Negative Login Scenarios](#12-story-111--negative-login-scenarios)
   - [STORY-1.1.1 — Security & Edge Cases](#13-story-111--security--edge-cases)
   - [STORY-1.1.1 — Session & Token Management](#14-story-111--session--token-management)
   - [STORY-1.1.1 — Audit Log Verification](#15-story-111--audit-log-verification)
   - [STORY-1.1.1 — Remember Me Feature](#16-story-111--remember-me-feature)
2. [FEAT-1.2: User & Role Management (Admin Only)](#2-feat-12-user--role-management-admin-only)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Create User (Positive)](#21-story-121-create-user-positive)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Create User (Negative)](#22-story-121-create-user-negative)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Edit User](#23-story-121-edit-user)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Deactivate User](#24-story-121-deactivate-user)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Role Change & Permission](#25-story-121-role-change--permission)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Access Control & Authorization](#26-story-121-access-control--authorization)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Audit Log for User Management](#27-story-121-audit-log-for-user-management)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Business Rules Validation](#28-story-121-business-rules-validation)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Audit Log API](#29-story-121-audit-log-api-query--view)
   - [STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Refresh Token Expiry](#210-story-121-refresh-token-expiry)
3. [Cross-Cutting Security Test Cases](#3-cross-cutting-security-test-cases)




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
  * *Expected Output:* HTTP 200 OK. Total response time (request to redirect) <= 2000ms. Token generation + password hash comparison + role lookup completes within threshold.
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
  * *Expected Output:* Password stored as bcrypt hash (format: `$2b$10$...` or `$2a$12$...`). Salt rounds >= 10. Hash length consistent with bcrypt standard. No plaintext or weak hashing (MD5/SHA1) detected.
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
## 2. FEAT-1.2: User & Role Management (Admin Only)

### 2.1 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Create User (Positive)

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
  * *Description:* Employee ID auto-generation ÃŽâ€œÃƒâ€¡ÃƒÂ¶ sequential and immutable
  * *Input:* Admin creates 3 users in sequence
  * *Expected Output:* Employee IDs generated as "EMP-00005", "EMP-00006", "EMP-00007". Format: EMP-XXXXX (5 digits, zero-padded). IDs sequential and never reused. Once assigned, ID cannot be changed.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-004 (Positive)**:
  * *Description:* System-generated password meets complexity requirements
  * *Input:* Inspect password generated for newly created user
  * *Expected Output:* Temporary password: ÃŽâ€œÃƒÂ«Ãƒâ€˜ 12 characters, contains uppercase, lowercase, number, and special character. Password is bcrypt hashed before storage. Plaintext password only exists in welcome email (one-time).
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
  * *Description:* Boundary ÃŽâ€œÃƒâ€¡ÃƒÂ¶ employee name at maximum length (100 characters)
  * *Input:* `employee_name = "A" * 100`
  * *Expected Output:* HTTP 201 Created. Name stored successfully. VARCHAR(100) constraint satisfied.
  * *Traceability:* STORY-1.2.1 (Boundary)

* **TEST-EP1-USER-010 (Positive)**:
  * *Description:* Boundary ÃŽâ€œÃƒâ€¡ÃƒÂ¶ email at maximum length (254 characters)
  * *Input:* `email = "a" * 243 + "@company.com"`
  * *Expected Output:* HTTP 201 Created. Email stored successfully. VARCHAR(255) constraint satisfied.
  * *Traceability:* STORY-1.2.1 (Boundary)

---

### 2.2 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Create User (Negative)

* **TEST-EP1-USER-011 (Negative)**:
  * *Description:* Duplicate email ÃŽâ€œÃƒâ€¡ÃƒÂ¶ email already registered
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
  * *Description:* Invalid role ÃŽâ€œÃƒâ€¡ÃƒÂ¶ not in allowed enum
  * *Input:* `role = "Sales Manager"`, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Invalid role. Allowed values: Admin, Marketing Executive." CHECK constraint or ENUM type rejects value.
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-018 (Negative)**:
  * *Description:* Invalid status ÃŽâ€œÃƒâ€¡ÃƒÂ¶ not in allowed enum
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
  * *Description:* Missing mandatory field ÃŽâ€œÃƒâ€¡ÃƒÂ¶ role
  * *Input:* `role = null` or omitted, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Role is required." NOT NULL constraint would also trigger at DB level.
  * *Traceability:* STORY-1.2.1 (Validation)

* **TEST-EP1-USER-026 (Negative)**:
  * *Description:* Missing mandatory field ÃŽâ€œÃƒâ€¡ÃƒÂ¶ status
  * *Input:* `status = null` or omitted, other fields valid
  * *Expected Output:* HTTP 400 Bad Request. Error message: "Status is required." Default value "Active" may apply if configured, but explicit requirement says mandatory.
  * *Traceability:* STORY-1.2.1 (Validation)

---

### 2.3 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Edit User

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
  * *Input:* User "EMP-00002" was changed from Marketing ÃŽâ€œÃƒÂ¥Ãƒâ€  Admin. User logs out and logs back in.
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

### 2.4 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Deactivate User

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
  * *Description:* Deactivate user from UI ÃŽâ€œÃƒâ€¡ÃƒÂ¶ verify no hard delete option
  * *Input:* Inspect User Management UI for delete button/functionality
  * *Expected Output:* No "Delete" button visible. Only "Deactivate" option available. API endpoint `/api/users/{id}/delete` returns 404 or 403 if attempted directly.
  * *Traceability:* STORY-1.2.1 BR-2

* **TEST-EP1-USER-040 (Negative)**:
  * *Description:* Attempt hard delete via direct API call
  * *Input:* DELETE `/api/users/EMP-00002` (even if endpoint exists)
  * *Expected Output:* HTTP 403 Forbidden or 404 Not Found. Error message: "User deletion is not permitted. Use deactivation instead." Referential integrity preserved.
  * *Traceability:* STORY-1.2.1 BR-2

---

### 2.5 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Role Change & Permission

* **TEST-EP1-USER-041 (Positive)**:
  * *Description:* Role change from Marketing Executive to Admin ÃŽâ€œÃƒâ€¡ÃƒÂ¶ immediate UI access after re-login
  * *Input:* User "EMP-00002" re-logins after role change to Admin
  * *Expected Output:* User sees Admin Dashboard. User Management menu visible. Can create/edit users. All Admin permissions active.
  * *Traceability:* STORY-1.2.1 AC-4

* **TEST-EP1-USER-042 (Positive)**:
  * *Description:* Role change from Admin to Marketing Executive ÃŽâ€œÃƒâ€¡ÃƒÂ¶ restricted access after re-login
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

### 2.6 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Access Control & Authorization

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

### 2.7 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Audit Log for User Management

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
  * *Input:* Admin deactivates "EMP-00005" (Active ÃŽâ€œÃƒÂ¥Ãƒâ€  Inactive)
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

### 2.8 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Business Rules Validation

* **TEST-EP1-USER-059 (Positive)**:
  * *Description:* Employee ID format verification ÃŽâ€œÃƒâ€¡ÃƒÂ¶ EMP-XXXXX
  * *Input:* Create 5 users sequentially
  * *Expected Output:* IDs: EMP-00001, EMP-00002, EMP-00003, EMP-00004, EMP-00005. Format: "EMP-" + 5-digit zero-padded sequential number. No gaps, no duplicates, no manual override possible.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-060 (Positive)**:
  * *Description:* Employee ID immutability ÃŽâ€œÃƒâ€¡ÃƒÂ¶ cannot be changed after creation
  * *Input:* Attempt to UPDATE `users` table SET `employee_id = 'EMP-99999'` WHERE `employee_id = 'EMP-00005'`
  * *Expected Output:* If DB constraint exists: PostgreSQL error ÃŽâ€œÃƒâ€¡ÃƒÂ¶ cannot update generated/primary key column. If application-level: HTTP 400 Bad Request. Employee ID permanently tied to user.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-061 (Positive)**:
  * *Description:* Deleting user is not permitted ÃŽâ€œÃƒâ€¡ÃƒÂ¶ only deactivation
  * *Input:* Attempt DELETE on `users` table row for "EMP-00005"
  * *Expected Output:* If ON DELETE RESTRICT on leads: PostgreSQL foreign key violation. If application-level: HTTP 403 Forbidden. User row preserved. Only `status` can be changed to "Inactive".
  * *Traceability:* STORY-1.2.1 BR-2

* **TEST-EP1-USER-062 (Positive)**:
  * *Description:* Referential integrity ÃŽâ€œÃƒâ€¡ÃƒÂ¶ leads assigned to deactivated user remain intact
  * *Input:* Create lead assigned to "EMP-00005". Deactivate "EMP-00005". Query leads table.
  * *Expected Output:* Lead row still has `assigned_to = 'EMP-00005'`. No CASCADE delete or SET NULL triggered. Foreign key constraint allows inactive reference (if designed) or application handles inactive assignee display.
  * *Traceability:* STORY-1.2.1 BR-2, AC-3

* **TEST-EP1-USER-063 (Positive)**:
  * *Description:* Referential integrity ÃŽâ€œÃƒâ€¡ÃƒÂ¶ audit records preserve user reference even if user deactivated
  * *Input:* Inspect `audit_log` for entries performed by "EMP-00005" (now deactivated)
  * *Expected Output:* Audit records still show `performed_by = 'EMP-00005'`. No orphaned records. User name may show as "John Doe (Inactive)" or remain as original name.
  * *Traceability:* STORY-1.2.1 BR-2

* **TEST-EP1-USER-064 (Positive)**:
  * *Description:* Account lockout threshold configurable by Admin in System Settings
  * *Input:* Admin navigates to System Settings. Changes lockout threshold from 5 to 3 attempts. Changes lockout duration from 15 to 30 minutes.
  * *Expected Output:* Settings saved. New threshold active immediately. Next login attempt: 3 failed attempts trigger 30-minute lockout. Previous lockout records unaffected.
  * *Traceability:* STORY-1.1.1 BR-3

* **TEST-EP1-USER-065 (Positive)**:
  * *Description:* System-generated password complexity ÃŽâ€œÃƒâ€¡ÃƒÂ¶ meets policy
  * *Input:* Create 10 users and inspect generated passwords
  * *Expected Output:* All 10 passwords: ÃŽâ€œÃƒÂ«Ãƒâ€˜ 12 chars, ÃŽâ€œÃƒÂ«Ãƒâ€˜ 1 uppercase, ÃŽâ€œÃƒÂ«Ãƒâ€˜ 1 lowercase, ÃŽâ€œÃƒÂ«Ãƒâ€˜ 1 digit, ÃŽâ€œÃƒÂ«Ãƒâ€˜ 1 special char. No dictionary words. Cryptographically random generation.
  * *Traceability:* STORY-1.2.1 BR-1

* **TEST-EP1-USER-066 (Positive)**:
  * *Description:* Welcome email contains only temporary credentials ÃŽâ€œÃƒâ€¡ÃƒÂ¶ no permanent password
  * *Input:* Inspect welcome email sent to new user
  * *Expected Output:* Email contains: employee_id, temporary password (plaintext, one-time), login URL, instruction to change password. No reference to permanent or default password.
  * *Traceability:* STORY-1.2.1 AC-1

---

### 2.9 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Audit Log API (Query & View)

* **TEST-EP1-USER-061 (Positive)**:
  * *Description:* Admin can list audit logs with pagination
  * *Input:* Admin requests GET `/api/admin/audit-log`
  * *Expected Output:* HTTP 200 OK. Returns array of audit log entries sorted by `createdAt` DESC. Response includes `pagination` object with `page`, `limit`, `totalRecords`, `totalPages`.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-062 (Positive)**:
  * *Description:* Admin can filter audit logs by action type
  * *Input:* Admin requests GET `/api/admin/audit-log?action=USER_CREATED`
  * *Expected Output:* HTTP 200 OK. Only audit logs with `action = "USER_CREATED"` returned. Filters for: `user_id`, `action`, `entity`, `from`, `to` date range.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-063 (Negative)**:
  * *Description:* Marketing Executive cannot access audit logs
  * *Input:* Marketing Executive requests GET `/api/admin/audit-log`
  * *Expected Output:* HTTP 403 Forbidden. Error message: "Admin access required."
  * *Traceability:* STORY-1.2.1 AC-5

* **TEST-EP1-USER-064 (Negative)**:
  * *Description:* Unauthenticated user cannot access audit logs
  * *Input:* No JWT token. GET `/api/admin/audit-log`
  * *Expected Output:* HTTP 401 Unauthorized. Error message: "No token provided."
  * *Traceability:* STORY-1.2.1 (Security)

* **TEST-EP1-USER-065 (Positive)**:
  * *Description:* Admin can view specific audit log entry by ID
  * *Input:* Admin requests GET `/api/admin/audit-log/{id}`
  * *Expected Output:* HTTP 200 OK. Returns full audit log entry with all fields: `id`, `user_id`, `email`, `action`, `resource`, `resourceId`, `details`, `ipAddress`, `userAgent`, `result`, `createdAt`.
  * *Traceability:* STORY-1.2.1 BR-3

* **TEST-EP1-USER-066 (Negative)**:
  * *Description:* View non-existent audit log entry returns 404
  * *Input:* Admin requests GET `/api/admin/audit-log/non-existent-id`
  * *Expected Output:* HTTP 404 Not Found. Error message: "Audit log not found."
  * *Traceability:* STORY-1.2.1 (Error handling)

---

### 2.10 STORY-1.2.1 ÃŽâ€œÃƒâ€¡ÃƒÂ¶ Refresh Token Expiry

* **TEST-EP1-USER-067 (Negative)**:
  * *Description:* Remember Me refresh token expired after 30 days + 1 second ÃŽâ€œÃƒâ€¡ÃƒÂ¶ must re-authenticate
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

* **TEST-EP1-SEC-001 (Security)**:
  * *Description:* CSRF protection on all state-changing endpoints
  * *Input:* Attempt POST/PUT/DELETE to `/api/users` without valid CSRF token (if session-based) or with tampered Origin header
  * *Expected Output:* HTTP 403 Forbidden. "Invalid CSRF token" or "Origin not allowed." State-changing requests rejected without valid CSRF protection.
  * *Traceability:* General Security

* **TEST-EP1-SEC-002 (Security)**:
  * *Description:* HTTPS enforcement ÃŽâ€œÃƒâ€¡ÃƒÂ¶ no plaintext HTTP access
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
  * *Description:* Password history ÃŽâ€œÃƒâ€¡ÃƒÂ¶ prevent reuse of last N passwords
  * *Input:* User changes password to same as previous password
  * *Expected Output:* HTTP 400 Bad Request. Error: "New password cannot be same as current password." If password history stored: "Password cannot match any of your last 5 passwords."
  * *Traceability:* General Security

* **TEST-EP1-SEC-008 (Security)**:
  * *Description:* Secure headers in all API responses
  * *Input:* Inspect response headers for any API endpoint
  * *Expected Output:* Headers include: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Content-Security-Policy` defined. No `Server` header revealing technology stack.
  * *Traceability:* General Security

* **TEST-EP1-SEC-009 (Security)**:
  * *Description:* Input validation on all fields ÃŽâ€œÃƒâ€¡ÃƒÂ¶ length, type, format
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

| Module | Total Test Cases |
|---|---|
| FEAT-1.1: User Login — Positive Scenarios | 6 |
| FEAT-1.1: User Login — Negative Scenarios | 13 |
| FEAT-1.1: User Login — Security & Edge Cases | 11 |
| FEAT-1.1: User Login — Session & Token Management | 10 |
| FEAT-1.1: User Login — Audit Log Verification | 8 |
| FEAT-1.1: User Login — Remember Me Feature | 5 |
| FEAT-1.2: User Management — Create User (Positive) | 10 |
| FEAT-1.2: User Management — Create User (Negative) | 16 |
| FEAT-1.2: User Management — Edit User | 8 |
| FEAT-1.2: User Management — Deactivate User | 6 |
| FEAT-1.2: User Management — Role Change & Permission | 5 |
| FEAT-1.2: User Management — Access Control & Authorization | 7 |
| FEAT-1.2: User Management — Audit Log for User Management | 6 |
| FEAT-1.2: User Management — Business Rules Validation | 8 |
| FEAT-1.2: User Management — Audit Log API | 6 |
| FEAT-1.2: User Management — Refresh Token Expiry | 3 |
| Cross-Cutting Security Test Cases | 10 |
| **Grand Total** | **138** |

---
 
