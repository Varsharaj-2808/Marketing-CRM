# Backend API Test Cases (STORY-3.2.1)

## Story & Task Reference

**[STORY-3.2.1]** 
As an Admin, I want to filter and view leads/dashboards by Business Category and Sub-Category so that I can identify high-value segments to target.

**Tasks Included:**
* **[TASK-3.2.1-01]** Add Category/Sub-Category filter to Lead List and Dashboard
* **[TASK-3.2.1-02]** Add Won-rate-by-Category widget to Admin Dashboard
* **[TASK-3.2.1-03]** Add Lead-volume-by-Category chart to Admin Dashboard
* **[TASK-3.2.1-04]** Enable category breakdown in CSV/Excel export

---

## Detailed API Test Scenarios

### [TASK-3.2.1-01] Add Category/Sub-Category filter to Lead List and Dashboard
**Goal:** Ensure Lead List and KPI endpoints accept and correctly apply `category_id` and `sub_category_id` query parameters.

**Test ID:** BE-TC-3.2.1-01
* **Description:** Admin Lead List filtered by Category
* **HTTP Method & Endpoint:** `GET /admin/leads?category_id=1`
* **Payload / Pre-conditions:** Category ID 1 exists with active leads
* **Expected Result:** `200 OK` returning paginated leads belonging to Category 1.

**Test ID:** BE-TC-3.2.1-02
* **Description:** Marketing Lead List filtered by Sub-Category
* **HTTP Method & Endpoint:** `GET /marketing/leads?category_id=1&sub_category_id=5`
* **Payload / Pre-conditions:** Logged-in marketing user
* **Expected Result:** `200 OK` returning assigned leads matching the specific Sub-Category.

**Test ID:** BE-TC-3.2.1-03
* **Description:** Admin Dashboard KPIs filtered by Category
* **HTTP Method & Endpoint:** `GET /admin/dashboard/kpis?category_id=1`
* **Payload / Pre-conditions:** Valid Category ID
* **Expected Result:** `200 OK` returning aggregated KPIs recalculated strictly for the requested Category.

---

### [TASK-3.2.1-02] Add Won-rate-by-Category widget to Admin Dashboard
**Goal:** Verify the new endpoint for Won-rate by Category metrics.

**Test ID:** BE-TC-3.2.1-04
* **Description:** Retrieve Won-rate by Category
* **HTTP Method & Endpoint:** `GET /admin/dashboard/won-rate-by-category` *(Proposed Endpoint)*
* **Payload / Pre-conditions:** Leads exist in closed stages across categories
* **Expected Result:** `200 OK` returning a list of categories and their respective win-rate percentages `(Won leads / Total closed leads)`.

---

### [TASK-3.2.1-03] Add Lead-volume-by-Category chart to Admin Dashboard
**Goal:** Verify the new endpoint for Lead Volume by Category.

**Test ID:** BE-TC-3.2.1-05
* **Description:** Retrieve Lead Volume grouped by Category
* **HTTP Method & Endpoint:** `GET /admin/dashboard/lead-volume-by-category` *(Proposed Endpoint)*
* **Payload / Pre-conditions:** Leads exist across multiple categories
* **Expected Result:** `200 OK` returning lead counts grouped by Category (and optionally Sub-Category).

---

### [TASK-3.2.1-04] Enable category breakdown in CSV/Excel export
**Goal:** Ensure export endpoints reflect category filters and include Category columns in the file payload.

**Test ID:** BE-TC-3.2.1-06
* **Description:** Admin Export Leads with Category Filter
* **HTTP Method & Endpoint:** `GET /admin/leads/export?format=csv&category_id=1`
* **Payload / Pre-conditions:** Valid category ID
* **Expected Result:** `200 OK` returning binary file stream (CSV). File content only contains leads from Category 1, and includes `Category` and `Sub-Category` columns.

**Test ID:** BE-TC-3.2.1-07
* **Description:** Export Report Grouped by Category
* **HTTP Method & Endpoint:** `GET /admin/reports/export?report=lead-conversion-by-category&format=excel`
* **Payload / Pre-conditions:** New report type requested
* **Expected Result:** `200 OK` returning Excel file containing conversion metrics explicitly grouped by Category.
