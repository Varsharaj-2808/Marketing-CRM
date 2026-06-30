# EPIC-2: Lead Management — Backend API Test Cases (STORY-2.1.1 Only)

> **Epic Goal:** Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome.
> **Story Goal:** As a Marketing Executive, I want to create a new lead capturing company, contact, source, and business category so that potential customers are tracked and segmented from day one.
> **Database ERD Design:** supabase PostgreSQL (Users, Leads, Business Categories, Business Sub Categories, Lead History, Lead Activities, Audit Logs tables)
> **Total Test Cases:** 20

---

## 📋 Table of Contents
0. [Database Schema Verification](#0-database-schema-verification)
1. [API-1: POST /marketing/leads](#1-api-1-post-marketingleads)
2. [API-2: GET /marketing/leads/check-mobile](#2-api-2-get-marketingleadscheck-mobile)
3. [API-3: GET /marketing/leads/check-email](#3-api-3-get-marketingleadscheck-email)
4. [API-4: GET /marketing/lead-sources](#4-api-4-get-adminlead-sources)
5. [API-5: GET /marketing/categories](#5-api-5-get-admincategories)
6. [API-6: GET /marketing/categories/:categoryId/subcategories](#6-api-6-get-admincategoriescategoryidsubcategories)
7. [API-7: GET /marketing/services](#7-api-7-get-adminservices)
8. [API-8: GET /marketing/leads/:id](#8-api-8-get-marketingleadsid)
9. [API-9: GET /marketing/leads/:id/lead-history](#9-api-9-get-marketingleadsidlead-history)
10.[API-10: GET /marketing/leads](#10-api-10-get-marketingleads)

---

## 0. Database Schema Verification
*Purpose: Validate database columns, constraints, and data types match the ERD design for Story 2.1.1.*

* **TEST-EP2-LEADS-000 (Positive)**:
  * *Description:* Verify Leads database table constraints and column datatypes
  * *Input:* Inspect database schema of `leads` table in Supabase PostgreSQL.
  * *Expected Output:* 
    * Primary key `id` is a UUID.
    * Columns exist for form fields: `company_name` (text, NOT NULL), `contact_person` (text, NOT NULL), `mobile_number` (phone text, NOT NULL), `email` (email text), `website` (url text), `city` (text), `lead_source` (select option enum, NOT NULL), `category` (UUID FK -> `business_categories.id`, NOT NULL), `sub_category` (UUID FK -> `business_sub_categories.id`), `service_interested` (multi-select array/text), `priority` (enum: 'Hot', 'Warm', 'Cold', NOT NULL), `estimated_value` (numeric currency).
    * Meta fields exist: `seq` (autonumber), `lead_id` (text matching formula format `LD-YYYY-[seq]`), `assigned_to` (UUID FK -> `users.id`), `stage` (select enum, default 'New Lead'), `created_at` (timestamp), and `updated_at` (timestamp).
  * *Traceability:* STORY-2.1.1, TASK-2.1.1-02

---

## 1. API-1: POST /marketing/leads
*Purpose: Main lead creation API with validations and default settings.*

* **TEST-EP2-LEADS-001 (Positive)**:
  * *Description:* Create lead with all valid mandatory and optional fields (Positive Scenario)
  * *Input:* `POST /marketing/leads` with JSON body:
    `{"company_name": "Supabase Systems", "contact_person": "Jane Doe", "mobile_number": "9876543210", "lead_source": "Website", "category": "d3b07384-d113-4a00-a541-b8448fb8b801", "sub_category": "e4c18495-e224-5b11-b652-c9559fc9c902", "service_interested": ["Web Dev"], "priority": "Hot", "estimated_value": 12000.00}`. Authenticated as Marketing Executive `user_id = "8f3a2b10-6c9c-4f7f-8d2b-9e4a3b2c1d0f"`.
  * *Expected Output:* HTTP 201 Created. Lead saved successfully. Generated unique ID matches pattern `^LD-\d{4}-\d{5}$` (e.g. `LD-2026-00005`). `assigned_to` defaults to the creator's ID. `lead_status` = "New Lead" and `stage` = "New Lead". Chronological insertion occurs in `lead_history`.
  * *Traceability:* STORY-2.1.1 AC-1, TASK-2.1.1-03, TASK-2.1.1-04, TASK-2.1.1-10, TASK-2.1.1-11, TASK-2.1.1-12

* **TEST-EP2-LEADS-002 (Negative)**:
  * *Description:* Lead creation fails due to missing mandatory inputs
  * *Input:* `POST /marketing/leads` with missing `company_name`, `contact_person`, `mobile_number`, `lead_source`, `category`, and `priority` in payload.
  * *Expected Output:* HTTP 400 Bad Request. JSON errors: `{"company_name": "Company Name is required", "contact_person": "Contact Person is required", "mobile_number": "Mobile Number is required", "lead_source": "Lead Source is required", "category": "Business Category is required", "priority": "Priority is required"}`. No record persisted.
  * *Traceability:* STORY-2.1.1 AC-3, TASK-2.1.1-03

* **TEST-EP2-LEADS-003 (Negative)**:
  * *Description:* Lead creation fails due to invalid mobile format (alphabetic / wrong length)
  * *Input:* `POST /marketing/leads` with `mobile_number = "98765abcde"` or `mobile_number = "12345"`.
  * *Expected Output:* HTTP 400 Bad Request. JSON response error: `{"mobile_number": "Mobile Number must be exactly 10 numeric digits"}`.
  * *Traceability:* STORY-2.1.1 AC-3, BR-2, TASK-2.1.1-03

* **TEST-EP2-LEADS-004 (Negative)**:
  * *Description:* Lead creation validation — invalid Priority enum value
  * *Input:* `POST /marketing/leads` with `priority = "Ultra Hot"` or `priority = null`.
  * *Expected Output:* HTTP 400 Bad Request. JSON response error: `{"priority": "Priority must be one of: Hot, Warm, Cold"}`.
  * *Traceability:* STORY-2.1.1 AC-3, TASK-2.1.1-03, TASK-2.1.1-08

---

## 2. API-2: GET /marketing/leads/check-mobile
*Purpose: Real-time duplicate check on Mobile number before creation.*

* **TEST-EP2-LEADS-005 (Positive)**:
  * *Description:* Mobile check detects no duplicate
  * *Input:* `GET /marketing/leads/check-mobile?mobile=9876543210` (Authenticated as ME).
  * *Expected Output:* HTTP 200 OK. JSON response: `{"isDuplicate": false}`.
  * *Traceability:* STORY-2.1.1 AC-2, TASK-2.1.1-09

* **TEST-EP2-LEADS-006 (Positive)**:
  * *Description:* Mobile check detects duplicate lead
  * *Input:* `GET /marketing/leads/check-mobile?mobile=9998887776` (Authenticated as ME). Database already contains an open lead with this mobile number and ID `LD-2026-00001`.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"isDuplicate": true, "leadId": "LD-2026-00001"}`.
  * *Traceability:* STORY-2.1.1 AC-2, TASK-2.1.1-09

---

## 3. API-3: GET /marketing/leads/check-email
*Purpose: Real-time duplicate check on Email before creation.*

* **TEST-EP2-LEADS-007 (Positive)**:
  * *Description:* Email check detects no duplicate
  * *Input:* `GET /marketing/leads/check-email?email=unique@company.com` (Authenticated as ME).
  * *Expected Output:* HTTP 200 OK. JSON response: `{"isDuplicate": false}`.
  * *Traceability:* STORY-2.1.1 AC-2, TASK-2.1.1-09

* **TEST-EP2-LEADS-008 (Positive)**:
  * *Description:* Email check detects duplicate lead
  * *Input:* `GET /marketing/leads/check-email?email=existing@company.com` (Authenticated as ME). Database already contains an open lead with this email and ID `LD-2026-00001`.
  * *Expected Output:* HTTP 200 OK. JSON response: `{"isDuplicate": true, "leadId": "LD-2026-00001"}`.
  * *Traceability:* STORY-2.1.1 AC-2, TASK-2.1.1-09

---

## 4. API-4: GET /admin/lead-sources
*Purpose: Fetch configurable list of lead sources for frontend dropdown.*

* **TEST-EP2-LEADS-009 (Positive)**:
  * *Description:* Fetch active lead sources list
  * *Input:* `GET /admin/lead-sources` (Authenticated as Admin or Marketing Executive).
  * *Expected Output:* HTTP 200 OK. JSON array containing active lead sources (e.g. `[{"id": 1, "name": "Website", "status": "Active"}, {"id": 2, "name": "Referral", "status": "Active"}]`). Inactive sources are excluded.
  * *Traceability:* STORY-2.1.1 AC-1, TASK-2.1.1-05

---

## 5. API-5: GET /admin/categories
*Purpose: Fetch active business categories to populate primary category dropdown.*

* **TEST-EP2-LEADS-010 (Positive)**:
  * *Description:* Fetch active business categories list
  * *Input:* `GET /admin/categories` (Authenticated as Admin or ME).
  * *Expected Output:* HTTP 200 OK. JSON array of active categories (e.g. `[{"id": "d3b07384-d113-4a00-a541-b8448fb8b801", "category_name": "IT Services", "status": "Active"}]`).
  * *Traceability:* STORY-2.1.1 AC-5, TASK-2.1.1-06

---

## 6. API-6: GET /admin/categories/:categoryId/subcategories
*Purpose: Fetch sub-categories filtered by parent Category ID for cascading dropdown.*

* **TEST-EP2-LEADS-011 (Positive)**:
  * *Description:* Fetch active sub-categories by valid Category ID
  * *Input:* `GET /admin/categories/d3b07384-d113-4a00-a541-b8448fb8b801/subcategories` (Authenticated as Admin or ME).
  * *Expected Output:* HTTP 200 OK. JSON array of subcategories belonging to Category ID `d3b07384...` (e.g. `[{"id": "e4c18495-e224-5b11-b652-c9559fc9c902", "sub_category_name": "Web Development", "status": "Active"}]`).
  * *Traceability:* STORY-2.1.1 AC-5, TASK-2.1.1-06

---

## 7. API-7: GET /admin/services
*Purpose: Fetch active services for "Service Interested" multi-select component.*

* **TEST-EP2-LEADS-012 (Positive)**:
  * *Description:* Fetch active services list
  * *Input:* `GET /admin/services` (Authenticated as Admin or ME).
  * *Expected Output:* HTTP 200 OK. JSON array of active services (e.g. `[{"id": 1, "name": "App Development", "status": "Active"}]`).
  * *Traceability:* STORY-2.1.1 AC-1, TASK-2.1.1-07

---

## 8. API-8: GET /marketing/leads/:id
*Purpose: Retrieve details of created lead (uniquely identified by UUID).*

* **TEST-EP2-LEADS-013 (Positive)**:
  * *Description:* ME user retrieves the details of the newly created lead
  * *Input:* `GET /marketing/leads/e4c18495-e224-5b11-b652-c9559fc9c902` (assigned to ME `8f3a2b10...`, authenticated as ME `8f3a2b10...`).
  * *Expected Output:* HTTP 200 OK. Returns full details of lead, verifying correct fields were persisted.
  * *Traceability:* STORY-2.1.1 AC-1, TASK-2.1.1-02

---

## 9. API-9: GET /marketing/leads/:id/lead-history
*Purpose: Verify lead-created log was successfully written to history table.*

* **TEST-EP2-LEADS-014 (Positive)**:
  * *Description:* Retrieve lead history list containing creation log event
  * *Input:* `GET /marketing/leads/e4c18495-e224-5b11-b652-c9559fc9c902/lead-history` (Authenticated as owner).
  * *Expected Output:* HTTP 200 OK. Returns array of timeline history objects. First row contains `change_summary = "Lead Created by Jane Miller on [timestamp]"` or `field_name = "lead_created"`.
  * *Traceability:* STORY-2.1.1 AC-4, TASK-2.1.1-12

10. API-10: GET /marketing/leads
Purpose: Fetch lead list with pagination, search, sorting, and filters.

## 10. API-10: GET /marketing/leads
*Purpose: Fetch lead list with pagination, search, sorting, and filters.*

* **TEST-EP2-LEADS-015 (Positive)**:
  * *Description:* Marketing Executive retrieves only their own assigned leads
  * *Input:* `GET /marketing/leads` authenticated as Marketing Executive `ME_A` (`8f3a2b10...`).
  * *Expected Output:* HTTP 200 OK. Returns JSON array of leads where `assigned_to` = `ME_A`.
  * *Traceability:* STORY-2.2.1 AC-1, TASK-2.2.1-02

* **TEST-EP2-LEADS-016 (Positive)**:
  * *Description:* Admin retrieves all leads in the system
  * *Input:* `GET /marketing/leads` authenticated as Admin.
  * *Expected Output:* HTTP 200 OK. Returns JSON array of all leads across all owners.
  * *Traceability:* STORY-2.2.1 AC-1, TASK-2.2.1-02

* **TEST-EP2-LEADS-017 (Positive)**:
  * *Description:* Search leads list by text query
  * *Input:* `GET /marketing/leads?search=Supabase` authenticated as ME `8f3a2b10...`.
  * *Expected Output:* HTTP 200 OK. Returns leads assigned to this ME containing the term "Supabase".
  * *Traceability:* STORY-2.2.1 AC-2, TASK-2.2.1-05

* **TEST-EP2-LEADS-018 (Positive)**:
  * *Description:* Filter leads list by priority and stage
  * *Input:* `GET /marketing/leads?priority=Hot&stage=New%20Lead` authenticated as ME `8f3a2b10...`.
  * *Expected Output:* HTTP 200 OK. Returns only leads where priority is "Hot" AND stage is "New Lead".
  * *Traceability:* STORY-2.2.1 AC-3, TASK-2.2.1-04

* **TEST-EP2-LEADS-019 (Positive)**:
  * *Description:* Sort leads by estimated value in descending order
  * *Input:* `GET /marketing/leads?sortBy=estimated_value&sortOrder=desc` authenticated as ME `8f3a2b10...`.
  * *Expected Output:* HTTP 200 OK. Returns list sorted with highest estimated values first.
  * *Traceability:* STORY-2.2.1 AC-4, TASK-2.2.1-03

* **TEST-EP2-LEADS-020 (Positive)**:
  * *Description:* Paginated leads retrieval (Page 2)
  * *Input:* `GET /marketing/leads?page=2&limit=25` authenticated as ME `8f3a2b10...`.
  * *Expected Output:* HTTP 200 OK. Returns leads 26-50 and pagination metadata: `{"page": 2, "totalPages": 3, "totalCount": 65, "data": [...]}`.
  * *Traceability:* STORY-2.2.1 AC-4, TASK-2.2.1-02
