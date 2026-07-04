# Frontend UI Test Cases (Detailed Text Format)

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

## Detailed UI Test Scenarios

### [TASK-3.1.1-01] Build Category Master screen
**Goal:** Ensure UI allows Admin to view, create, and edit top-level categories.

**Test ID:** FE-TC-3.1.1-01
* **Description:** View Category Master screen
* **Pre-conditions:** Admin logged in
* **Test Steps:** Navigate to Category Master screen
* **Expected Result:** List/DataGrid of top-level categories is displayed.

**Test ID:** FE-TC-3.1.1-02
* **Description:** Create new Category
* **Pre-conditions:** Admin on Category Master
* **Test Steps:** Click "New Category", enter valid details, click Save
* **Expected Result:** New category appears in the list, success toast/message is shown.

**Test ID:** FE-TC-3.1.1-03
* **Description:** Edit existing Category
* **Pre-conditions:** Admin on Category Master
* **Test Steps:** Click "Edit" on a category, change details, click Save
* **Expected Result:** Updated category details appear in the list, success message is shown.

---

### [TASK-3.1.1-02] Build Sub-Category Master screen
**Goal:** Ensure UI allows Admin to view, create, and edit sub-categories, selecting valid parent categories.

**Test ID:** FE-TC-3.1.1-04
* **Description:** View Sub-Category Master screen
* **Pre-conditions:** Admin logged in
* **Test Steps:** Navigate to Sub-Category Master screen
* **Expected Result:** List/DataGrid of sub-categories and their parent links is displayed.

**Test ID:** FE-TC-3.1.1-05
* **Description:** Create new Sub-Category
* **Pre-conditions:** Admin on Sub-Category Master
* **Test Steps:** Click "New Sub-Category", select Parent Category, enter name, click Save
* **Expected Result:** New sub-category appears under the specified parent category.

**Test ID:** FE-TC-3.1.1-06
* **Description:** Edit existing Sub-Category
* **Pre-conditions:** Admin on Sub-Category Master
* **Test Steps:** Click "Edit", modify parent or name, click Save
* **Expected Result:** Updated sub-category details appear correctly in the list.

---

### [TASK-3.1.1-03] Build cascading dropdown component
**Goal:** Verify cascading dropdown logic ensures correct sub-category filtering on Lead Entry screens.

**Test ID:** FE-TC-3.1.1-07
* **Description:** Verify Category Dropdown options
* **Pre-conditions:** User on Lead Entry/Edit screen
* **Test Steps:** Click on the "Category" dropdown
* **Expected Result:** List of active top-level categories is displayed.

**Test ID:** FE-TC-3.1.1-08
* **Description:** Verify Sub-Category filtering
* **Pre-conditions:** User on Lead Entry/Edit screen
* **Test Steps:** Select a Category from the first dropdown
* **Expected Result:** The "Sub-Category" dropdown options are filtered to match only the selected parent.

**Test ID:** FE-TC-3.1.1-09
* **Description:** Change Category clears Sub-Category
* **Pre-conditions:** User on Lead Entry/Edit screen
* **Test Steps:** Select Category A, select Sub A, then change Category to B
* **Expected Result:** The Sub-Category field is immediately reset/cleared.

---

### [TASK-3.1.1-04] Seed initial taxonomy
**Goal:** Confirm default taxonomy exists upon fresh deployment.

**Test ID:** FE-TC-3.1.1-10
* **Description:** Verify Seeded taxonomy UI presence
* **Pre-conditions:** Fresh system deployment
* **Test Steps:** Navigate to Category/Sub-category lists
* **Expected Result:** The pre-defined default taxonomy is visible in the data grids.

---

### [TASK-3.1.1-05] Prevent deletion in use; allow Deactivate
**Goal:** Validate frontend prevents deletion when constrained, and supports deactivating records.

**Test ID:** FE-TC-3.1.1-11
* **Description:** Delete item IN USE (Prevented)
* **Pre-conditions:** Admin on Master screens. Category/Sub-category is tied to a Lead.
* **Test Steps:** Click "Delete" action on the item
* **Expected Result:** Error modal/toast appears explaining it is in use and cannot be deleted.

**Test ID:** FE-TC-3.1.1-12
* **Description:** Delete item NOT IN USE
* **Pre-conditions:** Admin on Master screens. Category/Sub-category is NOT tied to any Lead.
* **Test Steps:** Click "Delete" action on the item
* **Expected Result:** Confirmation modal appears, upon confirm, item is removed from the list.

**Test ID:** FE-TC-3.1.1-13
* **Description:** Deactivate an item
* **Pre-conditions:** Admin on Category/Sub-Category row
* **Test Steps:** Click "Deactivate" / toggle the status switch
* **Expected Result:** Item is marked inactive, visually indicated (e.g., greyed out), success message shown.

**Test ID:** FE-TC-3.1.1-14
* **Description:** Inactive items hidden from dropdowns
* **Pre-conditions:** A deactivated category/sub-category exists
* **Test Steps:** Go to Lead Entry, open Category/Sub-Category dropdowns
* **Expected Result:** The deactivated item is NOT present in the dropdown lists.

---

### [TASK-3.1.1-06] Write Category Master changes to Audit Log
**Goal:** Ensure UI allows viewing audit logs for category changes (if applicable).

**Test ID:** FE-TC-3.1.1-15
* **Description:** View Category Master Audit Log
* **Pre-conditions:** Changes have been made to Categories, Admin logged in
* **Test Steps:** Navigate to Audit Log / History view for a Category
* **Expected Result:** UI correctly displays history of CREATE, UPDATE, or STATUS CHANGE actions with user and timestamp.
