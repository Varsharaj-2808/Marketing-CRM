# Backend API Test Cases (Detailed Text Format)

## Story & Task Reference

**[STORY-3.1.1]** 
As an Admin, I want to maintain a master list of Lead Business Categories and Sub-Categories so that Marketing can segment and target leads precisely.

**Tasks Included:**
* **[TASK-3.1.1-01]** Build Category Master screen (CRUD for top-level categories)
* **[TASK-3.1.1-02]** Build Sub-Category Master screen (CRUD, each linked to one parent category)
* **[TASK-3.1.1-03]** Build cascading dropdown component (Category -> filtered Sub-Category) for reuse on Lead Entry/Edit
* **[TASK-3.1.1-04]** Seed initial taxonomy (see Category Taxonomy tab) as system defaults
* **[TASK-3.1.1-05]** Prevent deletion of a Category/Sub-Category that is in use; allow Deactivate instead
* **[TASK-3.1.1-06]** Write Category Master changes to Audit Log

---

## Detailed API Test Scenarios

### [TASK-3.1.1-01] Category Master CRUD
**Goal:** Ensure API supports Creating, Reading, Updating, and Deleting (when not in use) top-level categories.

**Test ID:** BE-TC-3.1.1-01
* **Description:** Create new top-level category
* **HTTP Method & Endpoint:** `POST /api/categories`
* **Payload / Pre-conditions:** `{"name": "Technology", "description": "Tech leads"}`
* **Expected Result:** `201 Created` with category object (ID, name, status='active').

**Test ID:** BE-TC-3.1.1-02
* **Description:** Create duplicate category
* **HTTP Method & Endpoint:** `POST /api/categories`
* **Payload / Pre-conditions:** `{"name": "Technology"}` (already exists)
* **Expected Result:** `400 Bad Request` or `409 Conflict` (Name must be unique).

**Test ID:** BE-TC-3.1.1-03
* **Description:** Retrieve all categories
* **HTTP Method & Endpoint:** `GET /api/categories`
* **Payload / Pre-conditions:** Admin is authenticated
* **Expected Result:** `200 OK` returning an array of all top-level categories.

**Test ID:** BE-TC-3.1.1-04
* **Description:** Retrieve specific category
* **HTTP Method & Endpoint:** `GET /api/categories/{id}`
* **Payload / Pre-conditions:** Valid category ID
* **Expected Result:** `200 OK` returning the specific category object.

**Test ID:** BE-TC-3.1.1-05
* **Description:** Update existing category
* **HTTP Method & Endpoint:** `PUT /api/categories/{id}`
* **Payload / Pre-conditions:** `{"name": "Information Technology"}`
* **Expected Result:** `200 OK` with updated category data.

---

### [TASK-3.1.1-02] Sub-Category Master CRUD
**Goal:** Ensure API supports CRUD for sub-categories, strictly enforcing the parent-child relationship.

**Test ID:** BE-TC-3.1.1-06
* **Description:** Create sub-category linked to parent
* **HTTP Method & Endpoint:** `POST /api/subcategories`
* **Payload / Pre-conditions:** `{"parent_id": 1, "name": "Software"}`
* **Expected Result:** `201 Created` with sub-category object linked to `parent_id` 1.

**Test ID:** BE-TC-3.1.1-07
* **Description:** Create sub-category (invalid parent)
* **HTTP Method & Endpoint:** `POST /api/subcategories`
* **Payload / Pre-conditions:** `{"parent_id": 999, "name": "Hardware"}`
* **Expected Result:** `404 Not Found` or `400 Bad Request` (Invalid Parent ID).

**Test ID:** BE-TC-3.1.1-08
* **Description:** Retrieve sub-categories
* **HTTP Method & Endpoint:** `GET /api/subcategories`
* **Payload / Pre-conditions:** Admin is authenticated
* **Expected Result:** `200 OK` returning an array of sub-categories (with parent info).

**Test ID:** BE-TC-3.1.1-09
* **Description:** Update existing sub-category
* **HTTP Method & Endpoint:** `PUT /api/subcategories/{id}`
* **Payload / Pre-conditions:** `{"name": "Enterprise Software"}`
* **Expected Result:** `200 OK` with updated sub-category data.

---

### [TASK-3.1.1-03] Cascading Component Data Retrieval
**Goal:** Ensure the API can efficiently serve filtered sub-categories based on a specific parent category for the frontend dropdowns.

**Test ID:** BE-TC-3.1.1-10
* **Description:** Fetch sub-categories by category
* **HTTP Method & Endpoint:** `GET /api/categories/{id}/subcategories`
* **Payload / Pre-conditions:** Category ID exists and has children
* **Expected Result:** `200 OK` returning an array of *only* sub-categories belonging to that parent.

**Test ID:** BE-TC-3.1.1-11
* **Description:** Fetch sub-categories for empty parent
* **HTTP Method & Endpoint:** `GET /api/categories/{id}/subcategories`
* **Payload / Pre-conditions:** Category ID exists but has no children
* **Expected Result:** `200 OK` returning an empty array `[]`.

---

### [TASK-3.1.1-04] Seed Initial Taxonomy
**Goal:** Verify that the system's database seeding/migration script accurately populates default categories and sub-categories.

**Test ID:** BE-TC-3.1.1-12
* **Description:** Verify seeded data on fresh DB
* **HTTP Method & Endpoint:** `GET /api/categories`
* **Payload / Pre-conditions:** Run application DB seeding script
* **Expected Result:** `200 OK` and payload contains the exact default taxonomy list defined by product/business.

---

### [TASK-3.1.1-05] Prevent Deletion (In Use) & Allow Deactivation
**Goal:** Enforce referential integrity. Block hard deletes if the item is linked to a Lead, but allow the user to toggle the status to "Inactive".

**Test ID:** BE-TC-3.1.1-13
* **Description:** Delete category NOT in use
* **HTTP Method & Endpoint:** `DELETE /api/categories/{id}`
* **Payload / Pre-conditions:** Category has 0 linked leads
* **Expected Result:** `200 OK` or `204 No Content`. Item is hard deleted.

**Test ID:** BE-TC-3.1.1-14
* **Description:** Delete category IN USE
* **HTTP Method & Endpoint:** `DELETE /api/categories/{id}`
* **Payload / Pre-conditions:** Category is linked to 1+ leads
* **Expected Result:** `409 Conflict` with error message indicating it cannot be deleted because it is in use.

**Test ID:** BE-TC-3.1.1-15
* **Description:** Delete sub-category IN USE
* **HTTP Method & Endpoint:** `DELETE /api/subcategories/{id}`
* **Payload / Pre-conditions:** Sub-category linked to 1+ leads
* **Expected Result:** `409 Conflict` indicating it is in use.

**Test ID:** BE-TC-3.1.1-16
* **Description:** Deactivate a category
* **HTTP Method & Endpoint:** `PATCH /api/categories/{id}`
* **Payload / Pre-conditions:** `{"status": "inactive"}`
* **Expected Result:** `200 OK` with category status updated to inactive.

**Test ID:** BE-TC-3.1.1-17
* **Description:** Deactivate a sub-category
* **HTTP Method & Endpoint:** `PATCH /api/subcategories/{id}`
* **Payload / Pre-conditions:** `{"status": "inactive"}`
* **Expected Result:** `200 OK` with sub-category status updated to inactive.

**Test ID:** BE-TC-3.1.1-18
* **Description:** Fetch only active categories
* **HTTP Method & Endpoint:** `GET /api/categories?status=active`
* **Payload / Pre-conditions:** Database contains inactive items
* **Expected Result:** `200 OK`, response array *excludes* any deactivated categories.

---

### [TASK-3.1.1-06] Audit Log Integration
**Goal:** Verify that any modification to the Category Master triggers an audit log entry.

**Test ID:** BE-TC-3.1.1-19
* **Description:** Audit Log on Category Create
* **HTTP Method & Endpoint:** `GET /api/audit-logs`
* **Payload / Pre-conditions:** User created a category
* **Expected Result:** `200 OK` containing a new log entry: `action: CREATE`, `module: CATEGORY_MASTER`, user ID, and timestamp.

**Test ID:** BE-TC-3.1.1-20
* **Description:** Audit Log on Category Update
* **HTTP Method & Endpoint:** `GET /api/audit-logs`
* **Payload / Pre-conditions:** User updated a category
* **Expected Result:** `200 OK` containing log entry: `action: UPDATE`, showing "before" and "after" state of the category.

**Test ID:** BE-TC-3.1.1-21
* **Description:** Audit Log on Status Change
* **HTTP Method & Endpoint:** `GET /api/audit-logs`
* **Payload / Pre-conditions:** User deactivated a category
* **Expected Result:** `200 OK` containing log entry: `action: DEACTIVATE` (or update status).
