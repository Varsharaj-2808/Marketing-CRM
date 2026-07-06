# Frontend UI Test Cases (STORY-3.2.1)

## Story & Task Reference

**[STORY-3.2.1]** 
As an Admin, I want to filter and view leads/dashboards by Business Category and Sub-Category so that I can identify high-value segments to target.

**Tasks Included:**
* **[TASK-3.2.1-01]** Add Category/Sub-Category filter to Lead List and Dashboard
* **[TASK-3.2.1-02]** Add Won-rate-by-Category widget to Admin Dashboard
* **[TASK-3.2.1-03]** Add Lead-volume-by-Category chart to Admin Dashboard
* **[TASK-3.2.1-04]** Enable category breakdown in CSV/Excel export

---

## Detailed UI Test Scenarios

### [TASK-3.2.1-01] Add Category/Sub-Category filter to Lead List and Dashboard
**Goal:** Ensure UI correctly renders Category and Sub-Category dropdown filters and dynamically updates page content.

**Test ID:** FE-TC-3.2.1-01
* **Description:** View Category filters on Lead List
* **Pre-conditions:** Admin on Lead List screen
* **Test Steps:** Observe the filter panel
* **Expected Result:** Category and Sub-Category dropdowns are present. Sub-Category is disabled until a Category is selected.

**Test ID:** FE-TC-3.2.1-02
* **Description:** Apply Category filter on Dashboard
* **Pre-conditions:** Admin on Dashboard
* **Test Steps:** Select a Category from the dashboard global filter
* **Expected Result:** All KPI cards and charts visually enter a loading state and then update to reflect only data for the selected Category.

---

### [TASK-3.2.1-02] Add Won-rate-by-Category widget to Admin Dashboard
**Goal:** Validate the rendering of the Won-rate-by-Category percentage widget.

**Test ID:** FE-TC-3.2.1-03
* **Description:** View Won-rate-by-Category widget
* **Pre-conditions:** Admin on Dashboard
* **Test Steps:** Scroll to the Won-rate-by-Category widget
* **Expected Result:** Widget displays a percentage value calculated as (Won leads / Total closed leads) per category.

**Test ID:** FE-TC-3.2.1-04
* **Description:** Won-rate widget real-time update validation
* **Pre-conditions:** Admin on Dashboard, a lead's stage is changed to 'Won' in another tab
* **Test Steps:** Refresh dashboard or wait for socket update (if applicable)
* **Expected Result:** The percentage for the corresponding category accurately increases.

---

### [TASK-3.2.1-03] Add Lead-volume-by-Category chart to Admin Dashboard
**Goal:** Validate the visual representation of lead volumes grouped by category.

**Test ID:** FE-TC-3.2.1-05
* **Description:** View Lead-volume-by-Category chart
* **Pre-conditions:** Admin on Dashboard
* **Test Steps:** Locate the Lead-volume-by-Category chart
* **Expected Result:** A bar or pie chart accurately displays the total volume of leads distributed across different categories.

**Test ID:** FE-TC-3.2.1-06
* **Description:** Chart interaction and tooltip
* **Pre-conditions:** Admin viewing the Lead-volume chart
* **Test Steps:** Hover over a specific category segment/bar
* **Expected Result:** A tooltip appears displaying the exact category name and numerical lead count.

---

### [TASK-3.2.1-04] Enable category breakdown in CSV/Excel export
**Goal:** Verify the exported files visually contain the requested category breakdown data.

**Test ID:** FE-TC-3.2.1-07
* **Description:** Export Lead List CSV verification
* **Pre-conditions:** Admin on Lead List
* **Test Steps:** Click 'Export CSV', open the downloaded file
* **Expected Result:** The CSV file contains new columns titled "Category" and "Sub-Category" populated with correct data for each lead.

**Test ID:** FE-TC-3.2.1-08
* **Description:** Export Dashboard Report Excel verification
* **Pre-conditions:** Admin clicks export on Dashboard conversion report
* **Test Steps:** Open the downloaded Excel file
* **Expected Result:** The spreadsheet rows are properly broken down and grouped by Category.
