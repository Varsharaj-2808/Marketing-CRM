



Search pentaxial Technologies



PT

Home
1

DMs
2

Activity
3

Files
4

Later
5

More
0

pentaxial Technologies


Find a conversation…







Messages

CanvasListFolder
Loading history…
vishnu
  12:11 PM
frontend-story-2.2.1.md
 

frontend-story-2.2.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.2.1: Saved Views & Bulk Operations)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to save filter/view configurations and perform bulk operations (select, assign, export) on leads so that I can efficiently manage large lead volumes. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Saved Views — UI & Interaction
Saved Views — Create & Edit Flow
Saved Views — Delete Flow
Bulk Select — Checkbox & Selection UI
Bulk Assign — Modal & Submission
Bulk Export — Modal & Download
Lead List — Admin View (GET /admin/leads)
Role-Based Access — Admin vs ME
1. Saved Views — UI & Interaction
test-ep-2.2.1-001 (Positive):

Description: Saved Views panel renders correctly on Lead List page for Admin
Input: Navigate to /admin/leads as an Admin user. Mock GET /admin/leads/saved-views returns 2 views.
Expected Output: Saved Views sidebar or dropdown panel is visible. Two saved views are listed showing their names (e.g. “High Priority Leads”, “Today Follow-up”). Each row displays an edit (pencil) and delete (trash) icon. A “Save Current View” or “Create View” button is present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-002 (Positive):

Description: Empty state when no saved views exist
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns empty array [].
Expected Output: Empty state message displayed: “No saved views yet. Create your first view.” A prominent “Create View” call-to-action button is shown.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-003 (Positive):

Description: Apply a saved view populates filters and refreshes lead list
Input: Admin clicks on a saved view named “High Priority Leads” that has filters {"status":"Open","priority":"High"}. Mock GET /admin/leads/saved-views/{id} or read from local state.
Expected Output: Filter controls are updated: Status dropdown shows “Open”, Priority dropdown shows “High”. Lead list automatically refreshes with the applied filters. The saved view row is visually highlighted as “active”.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-004 (Positive):

Description: Loading skeleton shown while saved views are being fetched
Input: Navigate to /admin/leads. API response is delayed by 500ms.
Expected Output: A loading skeleton or spinner is displayed in the saved views panel until the API resolves. After resolution, skeletons are replaced with actual view names.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-005 (Negative):

Description: API failure when fetching saved views
Input: Navigate to /admin/leads. Mock GET /admin/leads/saved-views returns a 500 error.
Expected Output: Error state displayed: “Failed to load saved views. [Retry]”. Clicking “Retry” triggers the API call again.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-006 (Edge):

Description: Long view name truncation
Input: A saved view exists with a 100-character name. Mock the API response with this long name.
Expected Output: The name is visually truncated with an ellipsis (...) at a reasonable width. Full name is visible on hover (title attribute or tooltip).
Traceability: STORY-2.2.1, C1-44
2. Saved Views — Create & Edit Flow
test-ep-2.2.1-007 (Positive):

Description: Open “Create Saved View” modal
Input: Admin clicks “Save Current View” or “Create View” button. Current filter state: Status=Open, Priority=High, Stage=Contacted.
Expected Output: Modal dialog opens with title “Save Current View”. A text input labeled “View Name” is present (pre-filled with suggested name or empty). A read-only summary of current filters is displayed. “Save” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-008 (Positive):

Description: Create saved view with current filters
Input: Admin enters “High Priority Leads” in the name field, clicks “Save”. Mock POST /admin/leads/saved-views returns 201 with the created view object.
Expected Output: Modal closes. Success toast: “View ‘High Priority Leads’ saved successfully”. The new view appears in the saved views list. Lead list filter state is preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-009 (Positive):

Description: Open “Edit” modal for existing saved view
Input: Admin clicks the edit (pencil) icon on “High Priority Leads” view. Mock the view data with existing name and filters.
Expected Output: Modal opens titled “Edit View”. Name input is pre-filled with “High Priority Leads”. Filters section shows the existing filter configuration. “Update” and “Cancel” buttons are present.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-010 (Positive):

Description: Update saved view name via edit modal
Input: Admin changes name to “Hot Priority Leads”, clicks “Update”. Mock PUT /admin/leads/saved-views/{id} returns 200.
Expected Output: Modal closes. Success toast: “View updated successfully”. Name in the saved views list reflects the new name.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-011 (Negative):

Description: Create view with empty name — inline validation
Input: Admin clicks “Save” with an empty name field in the create modal.
Expected Output: Inline validation error shown: “View name is required”. Input border turns red. No API call is made. Modal remains open.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-012 (Negative):

Description: Create view with duplicate name — API error handling
Input: Admin enters an existing view name, clicks “Save”. Mock POST /admin/leads/saved-views returns 409 Conflict with {"error":"A saved view with this name already exists"}.
Expected Output: Inline error displayed below name input: “A saved view with this name already exists”. Modal stays open. User can correct the name and retry.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-013 (Negative):

Description: Network failure during save
Input: Admin fills in name, clicks “Save”. Mock network failure (fetch rejects).
Expected Output: Error toast: “Failed to save view. Please try again.” Modal remains open with the entered name preserved.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-014 (Edge):

Description: Cancel create/edit modal
Input: Admin opens create modal, enters a name, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Filter/lead list state is unchanged.
Traceability: STORY-2.2.1, C1-44
3. Saved Views — Delete Flow
test-ep-2.2.1-015 (Positive):

Description: Delete saved view with confirmation
Input: Admin clicks delete (trash) icon on “Today Follow-up” view. Confirmation modal appears with “Are you sure you want to delete ‘Today Follow-up’?” and “Delete” / “Cancel” buttons. Admin clicks “Delete”. Mock DELETE /admin/leads/saved-views/{id} returns 200.
Expected Output: Confirmation modal closes. Success toast: “View ‘Today Follow-up’ deleted”. View is removed from the saved views list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-016 (Negative):

Description: Cancel delete operation
Input: Admin clicks delete icon, confirmation modal opens. Admin clicks “Cancel”.
Expected Output: Modal closes. No API call is made. View remains in the list.
Traceability: STORY-2.2.1, C1-44
test-ep-2.2.1-017 (Negative):

Description: Delete API failure
Input: Admin confirms delete. Mock DELETE /admin/leads/saved-views/{id} returns 500.
Expected Output: Error toast: “Failed to delete view. Please try again.” View remains in the list (optimistic removal is rolled back).
Traceability: STORY-2.2.1, C1-44
4. Bulk Select — Checkbox & Selection UI
test-ep-2.2.1-018 (Positive):

Description: Select all leads via header checkbox
Input: Lead list displays 10 leads. Admin clicks the checkbox in the table header row.
Expected Output: All 10 visible leads are checked. A floating action bar appears at the bottom (or top) showing: “10 selected” with “Assign”, “Export”, and “Clear Selection” buttons. Mock POST /admin/leads/bulk-select is called with all 10 lead IDs.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-019 (Positive):

Description: Select individual leads
Input: Admin clicks checkboxes on rows 1, 3, and 5 individually.
Expected Output: Only rows 1, 3, and 5 are checked. Action bar shows “3 selected”. Header checkbox is in indeterminate (partial) state.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-020 (Positive):

Description: Deselect individual lead
Input: Admin selects all (10 selected), then unchecks row 5.
Expected Output: Row 5 unchecked. Counter shows “9 selected”. Header checkbox remains in indeterminate state. Action bar still visible.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-021 (Positive):

Description: Deselect all via “Clear Selection” button
Input: Admin selects 3 leads. Clicks “Clear Selection” in the action bar.
Expected Output: All checkboxes unchecked. Counter resets to 0. Action bar disappears/hides.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-022 (Positive):

Description: Deselect all via header checkbox when all selected
Input: All rows selected (header checkbox checked). Admin clicks header checkbox again.
Expected Output: All rows unchecked. Action bar disappears. Header checkbox unchecked.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-023 (Positive):

Description: Selection persists across pagination (client-side)
Input: Select 3 leads on page 1. Navigate to page 2. Navigate back to page 1.
Expected Output: The 3 leads on page 1 remain selected. Selection state is maintained in local state/context across page changes.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-024 (Edge):

Description: No leads match filter — select-all does nothing
Input: Apply a filter that returns 0 results.
Expected Output: Header checkbox is disabled or hidden. No rows to select. Action bar is not rendered.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-025 (Edge):

Description: Action bar hidden by default (no selection)
Input: Navigate to Lead List page without selecting any leads.
Expected Output: Action bar is not visible. Only row checkboxes and header checkbox are present.
Traceability: STORY-2.2.1, C1-45
5. Bulk Assign — Modal & Submission
test-ep-2.2.1-026 (Positive):

Description: Open bulk assign modal with selected leads
Input: Admin selects 2 leads, clicks “Assign” in the action bar. Mock GET /admin/users?role=Marketing%20Executive returns a list of active MEs.
Expected Output: Modal opens with title “Assign 2 Leads”. A user dropdown is populated with active Marketing Executives. An optional “Reason” text area is present. “Assign” and “Cancel” buttons are present. Summary text: “You are about to reassign 2 leads.”
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-027 (Positive):

Description: Complete bulk assign successfully
Input: Admin selects a user from dropdown, optionally enters a reason, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to John Doe”. Lead list refreshes. Action bar disappears. All selections cleared.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-028 (Negative):

Description: Submit assign with no user selected
Input: Admin opens assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation error: “Please select a user”. Modal does not close. No API call is made.
Traceability: STORY-2.2.1, C1-45
test-ep-2.2.1-029 (Negative):

Description: Assign API error handling…
vishnu
  2:11 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 35

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-025 (Edge):

Description: Bulk assign with single lead selected
Input: Admin selects 1 lead, clicks “Assign”.
Expected Output: Modal title: “Assign 1 Lead”. Flow works the same as single lead assignment.
Traceability: STORY-2.3.1, C1-47
4. Notifications — New Owner Notification
Purpose: The new owner receives an in-app notification when a lead is assigned/reassigned to them.

test-ep-2.3.1-026 (Positive):

Description: Notification bell shows unread badge after lead assignment
Input: Lead assigned to ME EMP-00002. ME navigates to their dashboard. Mock GET /notifications returns a new notification.
Expected Output: Notification bell icon in the top navigation bar displays a red badge with unread count (>=1). Badge shows the actual unread count.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-027 (Positive):

Description: Notification dropdown displays assignment notification
Input: ME clicks the notification bell icon.
Expected Output: Dropdown panel opens. New assignment notification appears at the top with text: “Lead [Lead ID] - [Company Name] has been assigned to you.” Notification shows relative timestamp (e.g., “2 minutes ago”). An icon (e.g., person-add or swap) indicates assignment event type.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-028 (Positive):

Description: Clicking notification navigates to the assigned lead
Input: ME clicks on the assignment notification in the dropdown.
Expected Output: Notification is …
vishnu
  2:38 PM
frontend-story-2.3.1.md
 

frontend-story-2.3.1.md
Markdown
EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
Lead History — Timeline Display
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-036 (Positive):

Description: Lead disappears from previous owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 (Old ME) to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as Old ME (EMP-00002) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is no longer present in Old ME’s “My Leads” list. The lead list does not return a row with lead-001. No stale data is cached — a fresh GET /marketing/leads API call confirms the lead is absent. Old ME sees a toast or visual cue only if the page was already open prior to reassignment (the list updates reactively via re-fetch or WebSocket/polling).
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-037 (Positive):

Description: Lead appears in new owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as New ME (EMP-00003) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is present in New ME’s “My Leads” list. The lead row displays the correct lead ID, company name, and other details. A fresh GET /marketing/leads API call confirms the lead is now included. If New ME was already on the list page, the lead appears reactively without manual refresh.
Traceability: STORY-2.3.1, C1-47, C1-50
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
**test-ep…






Message vishnu







Shift + Enter to add a new line




EPIC-2: Lead Management — Frontend Test Cases (STORY-2.3.1: Lead Assignment & Reassignment)
Epic Goal: Allow the marketing team to capture, own, find, and progress leads from first contact through to a closed outcome. Story Goal: As an Admin, I want to assign or reassign leads to Marketing Executives so that ownership and accountability are always clear. Tech Stack: React (Vite) / TailwindCSS / Vitest / React Testing Library Total Test Cases: 38

📋 Table of Contents
Lead Detail — Assign/Reassign Action
Reassignment Reason — Mandatory Reason Capture
Lead List — Bulk Assign Action
Notifications — New Owner Notification
Role-Based Access — ME vs Admin
Lead History — Timeline Display
1. Lead Detail — Assign/Reassign Action
Purpose: Admin can assign or reassign a lead via the Lead Detail page. The action button is visible only to Admin users.

test-ep-2.3.1-001 (Positive):

Description: “Assign/Reassign” button renders on Lead Detail page for Admin
Input: Navigate to /admin/leads/{id} as an Admin user. Mock GET /admin/leads/{id} returns lead data with current owner details.
Expected Output: A button labeled “Assign / Reassign” or similar is visible on the lead detail page (typically in the header or owner section). Button has a user icon or person-swap icon.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-002 (Positive):

Description: Clicking “Assign/Reassign” opens user selection dropdown
Input: Admin clicks “Assign/Reassign” button. Mock GET /admin/users?role=Marketing%20Executive returns a list of active Marketing Executives.
Expected Output: A user selection dropdown or modal opens. Dropdown is populated with active Marketing Executives showing their name and employee ID. A search/filter input may be present to find users. “Confirm” and “Cancel” buttons are present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-003 (Positive):

Description: Successful assignment with no existing owner
Input: Admin selects a user from dropdown (lead has no current owner), clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead assigned to [User Name]”. Lead detail page updates to show new owner name. Assignment timestamp is displayed. No reassignment reason field was shown (since lead was unowned).
Traceability: STORY-2.3.1, C1-47, C1-48
test-ep-2.3.1-004 (Positive):

Description: Successful reassignment with valid reason
Input: Admin selects a new user (lead has existing owner), enters a valid reason, clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 200.
Expected Output: Modal closes. Success toast: “Lead reassigned to [User Name]”. Owner name updates on detail page. Previous owner is no longer shown.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-005 (Positive):

Description: Owner field updates immediately on the UI after assignment
Input: After successful assignment API response, the lead detail page re-renders.
Expected Output: The “Assigned To” section shows the new owner’s name and employee ID. The “Assigned At” timestamp reflects the current time. Previous owner info is removed.
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-006 (Positive):

Description: Loading state shown while assign API is processing
Input: Admin clicks “Confirm” after selecting user. API response is delayed by 500ms.
Expected Output: “Confirm” button shows a spinner or “Assigning…” text during API call. Button is disabled to prevent double submission. After success, UI updates as normal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-007 (Negative):

Description: API error during assignment shows error toast
Input: Admin clicks “Confirm”. Mock PATCH /leads/{id}/assign returns 500 or network error.
Expected Output: Error toast: “Failed to assign lead. Please try again.” Modal remains open. User can retry or cancel. Lead owner on the detail page is unchanged.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-008 (Negative):

Description: API returns 404 for lead not found
Input: Admin attempts to assign a lead that was deleted. Mock PATCH /leads/{id}/assign returns 404.
Expected Output: Error toast: “Lead not found. It may have been deleted.” Modal closes. User is redirected to lead list.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-009 (Edge):

Description: Cancel assignment modal without changes
Input: Admin opens assign modal, selects a user, clicks “Cancel” or presses Escape key.
Expected Output: Modal closes. No API call is made. Lead owner on the detail page is unchanged. No toast shown.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-010 (Edge):

Description: No active Marketing Executives available
Input: Admin clicks “Assign/Reassign”. Mock GET /admin/users?role=Marketing%20Executive returns empty array.
Expected Output: Dropdown shows empty state: “No active Marketing Executives available.” “Confirm” button is disabled. Admin can close the modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-036 (Positive):

Description: Lead disappears from previous owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 (Old ME) to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as Old ME (EMP-00002) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is no longer present in Old ME’s “My Leads” list. The lead list does not return a row with lead-001. No stale data is cached — a fresh GET /marketing/leads API call confirms the lead is absent. Old ME sees a toast or visual cue only if the page was already open prior to reassignment (the list updates reactively via re-fetch or WebSocket/polling).
Traceability: STORY-2.3.1, C1-47, C1-50
test-ep-2.3.1-037 (Positive):

Description: Lead appears in new owner’s “My Leads” list immediately after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 (New ME) via the Lead Detail page with a valid reason. Then log in as New ME (EMP-00003) and navigate to /app/leads (My Leads list).
Expected Output: lead-001 is present in New ME’s “My Leads” list. The lead row displays the correct lead ID, company name, and other details. A fresh GET /marketing/leads API call confirms the lead is now included. If New ME was already on the list page, the lead appears reactively without manual refresh.
Traceability: STORY-2.3.1, C1-47, C1-50
2. Reassignment Reason — Mandatory Reason Capture
Purpose: When a lead already has an owner, the system requires a Reassignment Reason before saving. The UI shows a mandatory text area.

test-ep-2.3.1-011 (Positive):

Description: Reason text area appears when lead has existing owner
Input: Admin opens assign modal for a lead currently assigned to EMP-00002.
Expected Output: A required text area labeled “Reassignment Reason” is visible below the user dropdown. A hint text displays: “This lead is currently assigned to [Current Owner Name]. Please provide a reason for reassignment.” Text area has a character counter or max length indicator.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-012 (Positive):

Description: Reason text area is hidden when lead has no owner
Input: Admin opens assign modal for a lead with assigned_to = null (unowned).
Expected Output: No reassignment reason text area is shown. Only user dropdown and action buttons are visible.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-013 (Negative):

Description: Submit reassignment without entering a reason
Input: Admin selects a new user (lead has owner), leaves reason blank, clicks “Confirm”.
Expected Output: Inline validation error below text area: “Reassignment reason is required.” Text area border turns red. “Confirm” button does not trigger API call. Modal stays open.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-014 (Negative):

Description: Submit with whitespace-only reason
Input: Admin enters " " in the reason field, clicks “Confirm”.
Expected Output: Inline validation error: “Reassignment reason cannot be empty.” No API call made.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-015 (Edge):

Description: Reason field character limit enforcement
Input: Admin types a reason longer than 500 characters.
Expected Output: Text area enforces max length (500 chars). Input is truncated or prevented from exceeding limit. Character counter shows “500/500” at max. If no enforcement on input, API returns 400 and UI shows validation error.
Traceability: STORY-2.3.1, C1-49
test-ep-2.3.1-016 (Edge):

Description: Clear reason after typing
Input: Admin types a reason, then clears the field, clicks “Confirm”.
Expected Output: Validation error shown: “Reassignment reason is required.”
Traceability: STORY-2.3.1, C1-49
3. Lead List — Bulk Assign Action
Purpose: Admin can select multiple leads on the Lead List page and assign them to a Marketing Executive via a bulk action.

test-ep-2.3.1-017 (Positive):

Description: Bulk assign button visible in action bar when leads selected
Input: Admin selects 2 or more leads via checkboxes. Floating action bar appears.
Expected Output: Action bar shows “2 selected” with “Assign” button. Clicking “Assign” opens the bulk assign modal.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-018 (Positive):

Description: Bulk assign modal shows correct lead count
Input: Admin selects 3 leads, clicks “Assign” in action bar.
Expected Output: Modal opens with title “Assign 3 Leads”. Summary text: “You are about to reassign 3 leads.” User dropdown populated with active MEs. “Assign” and “Cancel” buttons present.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-019 (Positive):

Description: Bulk reassign with reason — all selected leads have owners
Input: Admin selects 2 leads (both have owners), picks a user, enters reason “Team restructuring”, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 200 with {"assigned":true,"count":2}.
Expected Output: Modal closes. Success toast: “2 leads assigned to [User Name]”. Selections cleared. Action bar disappears. Lead list refreshes.
Traceability: STORY-2.3.1, C1-47, C1-48, C1-49
test-ep-2.3.1-020 (Positive):

Description: Bulk assign without reason — all selected leads are unowned
Input: Admin selects 2 unowned leads, picks a user, clicks “Assign”. Mock returns 200.
Expected Output: Success. No reason field requested since no leads have owners.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-021 (Negative):

Description: Bulk assign without reason when some leads have owners
Input: Admin selects 2 leads (one owned, one unowned), picks a user, does not enter reason, clicks “Assign”. Mock returns 400.
Expected Output: Error toast: “Reassignment reason is required as one or more leads already have an owner.” Reason text area gets highlighted. Modal stays open.
Traceability: STORY-2.3.1, C1-47, C1-49
test-ep-2.3.1-022 (Negative):

Description: Bulk assign with no user selected
Input: Admin opens bulk assign modal, clicks “Assign” without selecting a user from dropdown.
Expected Output: Inline validation: “Please select a user to assign to.” No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-023 (Negative):

Description: Bulk assign API error handling
Input: Admin fills all fields, clicks “Assign”. Mock POST /admin/leads/bulk-assign returns 500.
Expected Output: Error toast: “Failed to assign leads. Please try again.” Modal remains open. Selections preserved.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-024 (Edge):

Description: Cancel bulk assign modal
Input: Admin opens modal, clicks “Cancel”.
Expected Output: Modal closes. Selections remain intact on the lead list. Action bar still visible. No API call made.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-025 (Edge):

Description: Bulk assign with single lead selected
Input: Admin selects 1 lead, clicks “Assign”.
Expected Output: Modal title: “Assign 1 Lead”. Flow works the same as single lead assignment.
Traceability: STORY-2.3.1, C1-47
4. Notifications — New Owner Notification
Purpose: The new owner receives an in-app notification when a lead is assigned/reassigned to them.

test-ep-2.3.1-026 (Positive):

Description: Notification bell shows unread badge after lead assignment
Input: Lead assigned to ME EMP-00002. ME navigates to their dashboard. Mock GET /notifications returns a new notification.
Expected Output: Notification bell icon in the top navigation bar displays a red badge with unread count (>=1). Badge shows the actual unread count.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-027 (Positive):

Description: Notification dropdown displays assignment notification
Input: ME clicks the notification bell icon.
Expected Output: Dropdown panel opens. New assignment notification appears at the top with text: “Lead [Lead ID] - [Company Name] has been assigned to you.” Notification shows relative timestamp (e.g., “2 minutes ago”). An icon (e.g., person-add or swap) indicates assignment event type.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-028 (Positive):

Description: Clicking notification navigates to the assigned lead
Input: ME clicks on the assignment notification in the dropdown.
Expected Output: Notification is marked as read (badge count decrements). Browser navigates to /app/leads/{id} (or equivalent). Lead detail page loads for the assigned lead.
Traceability: STORY-2.3.1, C1-47, C1-52
test-ep-2.3.1-029 (Positive):

Description: Notification badge updates after viewing all notifications
Input: ME has 3 unread notifications (including the new assignment). Opens dropdown and clicks “Mark all as read” or views them individually.
Expected Output: Badge disappears or shows 0. Notification items show as read (no bold/faded background).
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-030 (Edge):

Description: Empty notification state
Input: ME clicks notification bell with no notifications.
Expected Output: Dropdown shows empty state: “No new notifications.” No badge on bell icon.
Traceability: STORY-2.3.1, C1-52
test-ep-2.3.1-031 (Edge):

Description: Notifications persist across page navigation
Input: ME sees new notification, navigates to another page within the app.
Expected Output: Badge count persists (if unread). Notification list remains intact.
Traceability: STORY-2.3.1, C1-52
5. Role-Based Access — ME vs Admin
Purpose: Marketing Executives cannot access the Assign/Reassign action; the control is hidden (not just disabled) for that role.

test-ep-2.3.1-032 (Negative):

Description: Assign/Reassign button is hidden on Lead Detail for ME
Input: Navigate to /app/leads/{id} as a Marketing Executive. The lead is assigned to this ME.
Expected Output: No “Assign/Reassign” button is rendered anywhere on the page. The owner section shows the current owner name but no action to change it. Inspecting the DOM confirms the button element is absent (not just display:none or disabled).
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-033 (Negative):

Description: Bulk assign button is hidden on Lead List for ME
Input: Navigate to /app/leads as a Marketing Executive.
Expected Output: No row checkboxes are rendered. No bulk action bar appears at any point. No “Assign” option is available. ME can only view their own leads, not reassign them.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-034 (Negative):

Description: ME cannot access Admin route via direct URL manipulation
Input: ME types /admin/leads/{id} directly in browser URL bar.
Expected Output: Page shows “Access Denied” message or redirects to /app/leads. No assign functionality is accessible. API calls to admin endpoints return 403 and are handled gracefully.
Traceability: STORY-2.3.1, C1-47
test-ep-2.3.1-035 (Negative):

Description: Admin sees assign action, ME does not — visual comparison
Input: Login as Admin, navigate to Lead Detail — assign button visible. Logout. Login as ME, navigate to same lead — assign button absent.
Expected Output: Admin sees assign button. ME does not see assign button. This confirms role-based conditional rendering.
Traceability: STORY-2.3.1, C1-47
6. Lead History — Timeline Display
Purpose: The Lead Detail page displays an immutable timeline showing assignment events with previous owner, new owner, reason, actor, and timestamp.

test-ep-2.3.1-038 (Positive):
Description: Timeline displays assignment event with all required fields after reassignment
Input: Admin reassigns lead lead-001 from EMP-00002 to EMP-00003 with reason “Workload rebalancing”. Navigate to the Lead Detail page /admin/leads/{id} and scroll to the “Timeline” or “Lead History” section.
Expected Output: The timeline displays an immutable entry of type “Assigned/Reassigned” (or similar). The entry contains: Previous Owner showing Old ME’s name (EMP-00002), New Owner showing New ME’s name (EMP-00003), Reason showing “Workload rebalancing”, Actor showing Admin’s name (EMP-00001), and Timestamp showing the UTC date/time of the reassignment. The entry has an assignment-specific icon (e.g., swap/user-change icon). No edit or delete controls are present on any timeline entry. The entry is read-only for all roles including Admin.
Traceability: STORY-2.3.1, C1-47, C1-51
End of Frontend Test Cases for STORY-2.3.1 — Total: 38 test cases (Sections 1–6)

